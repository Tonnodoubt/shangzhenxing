const { getSellableStock } = require("./prisma-utils");

function createStorefrontPrismaCartModule({
  buildCartPageData,
  createStorefrontError,
  getCurrentUserContext,
  mapAddress,
  toNumber
}) {

  async function resolveCartProductSnapshot(prisma, productId, specText = "", skuId = "") {
    const product = await prisma.product.findUnique({
      where: {
        id: productId
      },
      include: {
        skus: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!product) {
      throw createStorefrontError("商品不存在", 404, "PRODUCT_NOT_FOUND");
    }

    if (product.status !== "on_sale") {
      throw createStorefrontError("商品已下架", 409, "PRODUCT_OFF_SALE");
    }

    const enabledSkus = (product.skus || []).filter((item) => item.status === "enabled");

    if (!enabledSkus.length) {
      throw createStorefrontError("商品规格不存在", 404, "SKU_NOT_FOUND");
    }

    const normalizedSpecText = String(specText || "").trim();
    let matchedSku = skuId ? enabledSkus.find((item) => item.id === skuId) : null;

    if (!matchedSku && normalizedSpecText) {
      matchedSku = enabledSkus.find((item) => String(item.specText || "").trim() === normalizedSpecText);
    }

    if (!matchedSku && enabledSkus.length === 1) {
      matchedSku = enabledSkus[0];
    }

    if (!matchedSku) {
      throw createStorefrontError("所选规格不存在", 404, "SKU_NOT_FOUND");
    }

    return {
      product,
      sku: matchedSku,
      specText: String(matchedSku.specText || normalizedSpecText || "").trim()
    };
  }

  function assertCartItemStock(product, sku, nextQuantity) {
    if (getSellableStock(sku) < nextQuantity) {
      throw createStorefrontError(
        `「${product.title || "商品"}」库存不足`,
        400,
        "STOCK_INSUFFICIENT"
      );
    }
  }

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
      include: {
        sku: true
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

        const addresses = await getAddresses(prisma, user.id);
        const selectedAddress = addresses.find((item) => item.isDefault) || addresses[0] || null;
        return {
          addresses: addresses.map((item) => mapAddress(item)),
          selectedAddressId: selectedAddress ? selectedAddress.id : ""
        };
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

        const resolvedItems = [];

        await prisma.$transaction(async (tx) => {
          await tx.cartItem.deleteMany({
            where: {
              cartId: cart.id
            }
          });

          for (const item of cartItems) {
            const quantity = Math.max(1, Number(item.quantity || 1));
            const {
              product,
              sku,
              specText
            } = await resolveCartProductSnapshot(tx, item.id, item.specText, item.skuId);

            assertCartItemStock(product, sku, quantity);

            resolvedItems.push({
              cartId: cart.id,
              productId: item.id,
              skuId: sku.id,
              title: product.title || "",
              specText,
              price: toNumber(sku.price || product.price),
              quantity
            });
          }

          await tx.cartItem.createMany({ data: resolvedItems });
        });

        return getCartPageData(sessionToken);
      },
      async addToCart(sessionToken, product = {}) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const cart = await ensureCart(prisma, user.id);
        const quantity = Math.max(1, Number(product.quantity || 1));
        const {
          product: dbProduct,
          sku,
          specText
        } = await resolveCartProductSnapshot(prisma, product.id, product.specText, product.skuId);

        const existing = await prisma.cartItem.findFirst({
          where: {
            cartId: cart.id,
            productId: product.id,
            specText
          }
        });

        assertCartItemStock(
          dbProduct,
          sku,
          quantity + Number(existing ? existing.quantity || 0 : 0)
        );

        if (existing) {
          await prisma.cartItem.update({
            where: {
              id: existing.id
            },
            data: {
              skuId: sku.id,
              title: dbProduct.title || "",
              specText,
              price: toNumber(sku.price || dbProduct.price),
              quantity: {
                increment: quantity
              }
            }
          });
        } else {
          await prisma.cartItem.create({
            data: {
              cartId: cart.id,
              productId: product.id,
              skuId: sku.id,
              title: dbProduct.title || "",
              specText,
              price: toNumber(sku.price || dbProduct.price),
              quantity
            }
          });
        }

        return buildCartPageData(await getCartItems(prisma, user.id));
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
          const {
            product,
            sku,
            specText: resolvedSpecText
          } = await resolveCartProductSnapshot(prisma, productId, item.specText, item.skuId);

          assertCartItemStock(product, sku, Number(item.quantity || 0) + 1);

          await prisma.cartItem.update({
            where: {
              id: item.id
            },
            data: {
              skuId: sku.id,
              title: product.title || "",
              specText: resolvedSpecText,
              price: toNumber(sku.price || product.price),
              quantity: {
                increment: 1
              }
            }
          });
        }

        return buildCartPageData(await getCartItems(prisma, user.id));
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

        return buildCartPageData(await getCartItems(prisma, user.id));
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

        return buildCartPageData(await getCartItems(prisma, user.id));
      }
    }
  };
}

module.exports = {
  createStorefrontPrismaCartModule
};
