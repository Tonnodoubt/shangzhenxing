function createStorefrontPrismaCartModule({
  buildCartPageData,
  getCurrentUserContext,
  mapAddress,
  toNumber
}) {
  async function getSelectedAddress(prisma, userId) {
    return prisma.address.findFirst({
      where: {
        userId
      },
      orderBy: [
        {
          isDefault: "desc"
        },
        {
          updatedAt: "desc"
        }
      ]
    });
  }

  async function getAddresses(prisma, userId) {
    return prisma.address.findMany({
      where: {
        userId
      },
      orderBy: [
        {
          isDefault: "desc"
        },
        {
          updatedAt: "desc"
        }
      ]
    });
  }

  async function ensureCart(prisma, userId) {
    return prisma.cart.upsert({
      where: {
        userId
      },
      update: {},
      create: {
        userId
      }
    });
  }

  async function getCartItems(prisma, userId) {
    const cart = await ensureCart(prisma, userId);

    return prisma.cartItem.findMany({
      where: {
        cartId: cart.id
      },
      orderBy: [
        {
          updatedAt: "desc"
        }
      ]
    });
  }

  async function getCartRecord(prisma, userId) {
    const cart = await ensureCart(prisma, userId);

    return prisma.cart.findUnique({
      where: {
        id: cart.id
      }
    });
  }

  async function getAddressListData(sessionToken) {
    const { prisma, user } = await getCurrentUserContext(sessionToken);
    const addresses = await getAddresses(prisma, user.id);
    const selectedAddress = addresses.find((item) => item.isDefault) || addresses[0] || null;

    return {
      addresses: addresses.map((item) => mapAddress(item)),
      selectedAddressId: selectedAddress ? selectedAddress.id : ""
    };
  }

  async function getCartPageData(sessionToken) {
    const { prisma, user } = await getCurrentUserContext(sessionToken);
    const cartItems = await getCartItems(prisma, user.id);

    return buildCartPageData(cartItems);
  }

  return {
    helpers: {
      ensureCart,
      getAddresses,
      getCartItems,
      getCartRecord,
      getSelectedAddress
    },
    methods: {
      getAddressListData,
      async getAddressById(sessionToken, addressId) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const address = await prisma.address.findFirst({
          where: {
            id: addressId,
            userId: user.id
          }
        });

        return mapAddress(address);
      },
      async createAddress(sessionToken, payload = {}) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const currentAddresses = await getAddresses(prisma, user.id);
        const shouldSetDefault = !!payload.isDefault || currentAddresses.length === 0;

        const record = await prisma.$transaction(async (tx) => {
          if (shouldSetDefault) {
            await tx.address.updateMany({
              where: {
                userId: user.id
              },
              data: {
                isDefault: false
              }
            });
          }

          return tx.address.create({
            data: {
              userId: user.id,
              receiver: payload.receiver || "",
              phone: payload.phone || "",
              detail: payload.detail || "",
              tag: payload.tag || "",
              isDefault: shouldSetDefault
            }
          });
        });

        return mapAddress(record);
      },
      async updateAddress(sessionToken, addressId, payload = {}) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const current = await prisma.address.findFirst({
          where: {
            id: addressId,
            userId: user.id
          }
        });

        if (!current) {
          return null;
        }

        const shouldSetDefault = typeof payload.isDefault === "boolean" ? payload.isDefault : current.isDefault;

        const record = await prisma.$transaction(async (tx) => {
          if (shouldSetDefault) {
            await tx.address.updateMany({
              where: {
                userId: user.id
              },
              data: {
                isDefault: false
              }
            });
          }

          return tx.address.update({
            where: {
              id: addressId
            },
            data: {
              receiver: payload.receiver || current.receiver,
              phone: payload.phone || current.phone,
              detail: payload.detail || current.detail,
              tag: Object.prototype.hasOwnProperty.call(payload, "tag") ? (payload.tag || "") : current.tag,
              isDefault: shouldSetDefault
            }
          });
        });

        return mapAddress(record);
      },
      async deleteAddress(sessionToken, addressId) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        await prisma.$transaction(async (tx) => {
          await tx.address.deleteMany({
            where: {
              id: addressId,
              userId: user.id
            }
          });

          const nextDefault = await tx.address.findFirst({
            where: {
              userId: user.id
            },
            orderBy: {
              updatedAt: "desc"
            }
          });

          if (nextDefault) {
            await tx.address.updateMany({
              where: {
                userId: user.id
              },
              data: {
                isDefault: false
              }
            });

            await tx.address.update({
              where: {
                id: nextDefault.id
              },
              data: {
                isDefault: true
              }
            });
          }
        });

        return getAddressListData(sessionToken);
      },
      async setSelectedAddress(sessionToken, addressId) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        await prisma.$transaction(async (tx) => {
          await tx.address.updateMany({
            where: {
              userId: user.id
            },
            data: {
              isDefault: false
            }
          });

          await tx.address.updateMany({
            where: {
              id: addressId,
              userId: user.id
            },
            data: {
              isDefault: true
            }
          });
        });

        const selected = await getSelectedAddress(prisma, user.id);

        return mapAddress(selected);
      },
      getCartPageData,
      async setCartItems(sessionToken, cartItems = []) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const cart = await ensureCart(prisma, user.id);

        await prisma.$transaction(async (tx) => {
          await tx.cartItem.deleteMany({
            where: {
              cartId: cart.id
            }
          });

          for (const item of cartItems) {
            await tx.cartItem.create({
              data: {
                cartId: cart.id,
                productId: item.id,
                title: item.title || "",
                specText: item.specText || "",
                price: toNumber(item.price),
                quantity: Number(item.quantity || 1)
              }
            });
          }
        });

        return getCartPageData(sessionToken);
      },
      async addToCart(sessionToken, product = {}) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const cart = await ensureCart(prisma, user.id);
        const existing = await prisma.cartItem.findFirst({
          where: {
            cartId: cart.id,
            productId: product.id,
            specText: product.specText || ""
          }
        });

        if (existing) {
          await prisma.cartItem.update({
            where: {
              id: existing.id
            },
            data: {
              quantity: {
                increment: Number(product.quantity || 1)
              }
            }
          });
        } else {
          await prisma.cartItem.create({
            data: {
              cartId: cart.id,
              productId: product.id,
              title: product.title || "",
              specText: product.specText || "",
              price: toNumber(product.price),
              quantity: Number(product.quantity || 1)
            }
          });
        }

        return getCartPageData(sessionToken);
      },
      async increaseCartItem(sessionToken, productId, specText) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const cart = await ensureCart(prisma, user.id);
        const item = await prisma.cartItem.findFirst({
          where: {
            cartId: cart.id,
            productId,
            specText: specText || ""
          }
        });

        if (item) {
          await prisma.cartItem.update({
            where: {
              id: item.id
            },
            data: {
              quantity: {
                increment: 1
              }
            }
          });
        }

        return getCartPageData(sessionToken);
      },
      async decreaseCartItem(sessionToken, productId, specText) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const cart = await ensureCart(prisma, user.id);
        const item = await prisma.cartItem.findFirst({
          where: {
            cartId: cart.id,
            productId,
            specText: specText || ""
          }
        });

        if (item) {
          if (Number(item.quantity || 0) <= 1) {
            await prisma.cartItem.delete({
              where: {
                id: item.id
              }
            });
          } else {
            await prisma.cartItem.update({
              where: {
                id: item.id
              },
              data: {
                quantity: {
                  decrement: 1
                }
              }
            });
          }
        }

        return getCartPageData(sessionToken);
      },
      async removeCartItem(sessionToken, productId, specText) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const cart = await ensureCart(prisma, user.id);

        await prisma.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            productId,
            specText: specText || ""
          }
        });

        return getCartPageData(sessionToken);
      }
    }
  };
}

module.exports = {
  createStorefrontPrismaCartModule
};
