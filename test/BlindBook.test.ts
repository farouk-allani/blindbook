import hre from "hardhat";
import { expect } from "chai";
import { CofheClient, Encryptable } from "@cofhe/sdk";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BlindBook", function () {
  let blindBook: any;
  let buyer: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let buyerClient: CofheClient;
  let sellerClient: CofheClient;

  const Side = { BUY: 0, SELL: 1 };
  const Status = { ACTIVE: 0, FILLED: 1, CANCELLED: 2 };

  // Encrypt an (amount, price) pair client-side and return the InEuint64-shaped tuple
  async function encryptOrder(client: CofheClient, amount: bigint, price: bigint) {
    const [encAmount, encPrice] = await client
      .encryptInputs([Encryptable.uint64(amount), Encryptable.uint64(price)])
      .execute();
    return { encAmount, encPrice };
  }

  beforeEach(async function () {
    [buyer, seller] = await hre.ethers.getSigners();
    buyerClient = await hre.cofhe.createClientWithBatteries(buyer);
    sellerClient = await hre.cofhe.createClientWithBatteries(seller);

    const BlindBook = await hre.ethers.getContractFactory("BlindBook");
    blindBook = await BlindBook.deploy();
    await blindBook.waitForDeployment();
  });

  describe("Order Submission", function () {
    it("should submit a buy order with client-side encrypted inputs", async function () {
      const { encAmount, encPrice } = await encryptOrder(buyerClient, 100n, 5000n);
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, encAmount, encPrice)).wait();

      const [trader, side, status] = await blindBook.getOrderInfo(0);
      expect(trader).to.equal(buyer.address);
      expect(side).to.equal(Side.BUY);
      expect(status).to.equal(Status.ACTIVE);
    });

    it("should store the imported encrypted amount without seeing plaintext", async function () {
      const { encAmount, encPrice } = await encryptOrder(buyerClient, 100n, 5000n);
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, encAmount, encPrice)).wait();

      const storedAmount = await blindBook.getOrderAmount(0);
      expect(storedAmount).to.not.equal(0); // ciphertext handle
      await hre.cofhe.mocks.expectPlaintext(storedAmount, 100n);
    });
  });

  describe("FHE Matching", function () {
    it("should match orders using FHE.lte, FHE.min, FHE.select", async function () {
      const buy = await encryptOrder(buyerClient, 100n, 5000n);
      const sell = await encryptOrder(sellerClient, 50n, 4800n);
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, buy.encAmount, buy.encPrice)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, sell.encAmount, sell.encPrice)).wait();

      await (await blindBook.matchOrders(0, 1)).wait();

      const fillQtyHash = await blindBook.getMatchFillQty(0);
      await hre.cofhe.mocks.expectPlaintext(fillQtyHash, 50n);
    });

    it("should match when prices are equal (FHE.lte)", async function () {
      const buy = await encryptOrder(buyerClient, 100n, 5000n);
      const sell = await encryptOrder(sellerClient, 50n, 5000n);
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, buy.encAmount, buy.encPrice)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, sell.encAmount, sell.encPrice)).wait();

      await (await blindBook.matchOrders(0, 1)).wait();

      const fillQtyHash = await blindBook.getMatchFillQty(0);
      await hre.cofhe.mocks.expectPlaintext(fillQtyHash, 50n);
    });

    it("should NOT match when sell price > buy price", async function () {
      const buy = await encryptOrder(buyerClient, 100n, 3000n);
      const sell = await encryptOrder(sellerClient, 50n, 5000n);
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, buy.encAmount, buy.encPrice)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, sell.encAmount, sell.encPrice)).wait();

      await (await blindBook.matchOrders(0, 1)).wait();

      const fillQtyHash = await blindBook.getMatchFillQty(0);
      await hre.cofhe.mocks.expectPlaintext(fillQtyHash, 0n);
    });

    it("should compute remaining amounts via FHE.select and FHE.sub", async function () {
      const buy = await encryptOrder(buyerClient, 100n, 5000n);
      const sell = await encryptOrder(sellerClient, 50n, 4800n);
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, buy.encAmount, buy.encPrice)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, sell.encAmount, sell.encPrice)).wait();

      await (await blindBook.matchOrders(0, 1)).wait();

      const buyRemaining = await blindBook.getOrderAmount(0);
      await hre.cofhe.mocks.expectPlaintext(buyRemaining, 50n);

      const sellRemaining = await blindBook.getOrderAmount(1);
      await hre.cofhe.mocks.expectPlaintext(sellRemaining, 0n);
    });
  });

  describe("Reveal & Settlement", function () {
    it("should mark FILLED on successful reveal", async function () {
      const buy = await encryptOrder(buyerClient, 100n, 5000n);
      const sell = await encryptOrder(sellerClient, 50n, 4800n);
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, buy.encAmount, buy.encPrice)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, sell.encAmount, sell.encPrice)).wait();
      await (await blindBook.matchOrders(0, 1)).wait();
      await (await blindBook.revealFill(0, 50)).wait();

      const [, , buyStatus] = await blindBook.getOrderInfo(0);
      const [, , sellStatus] = await blindBook.getOrderInfo(1);
      expect(buyStatus).to.equal(Status.FILLED);
      expect(sellStatus).to.equal(Status.FILLED);
    });

    it("should keep ACTIVE on zero-fill reveal", async function () {
      const buy = await encryptOrder(buyerClient, 100n, 3000n);
      const sell = await encryptOrder(sellerClient, 50n, 5000n);
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, buy.encAmount, buy.encPrice)).wait();
      await (await blindBook.connect(seller).submitOrder(Side.SELL, sell.encAmount, sell.encPrice)).wait();
      await (await blindBook.matchOrders(0, 1)).wait();
      await (await blindBook.revealFill(0, 0)).wait();

      const [, , buyStatus] = await blindBook.getOrderInfo(0);
      expect(buyStatus).to.equal(Status.ACTIVE);
    });
  });

  describe("Cancellation", function () {
    it("should cancel own order", async function () {
      const { encAmount, encPrice } = await encryptOrder(buyerClient, 100n, 5000n);
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, encAmount, encPrice)).wait();
      await (await blindBook.connect(buyer).cancelOrder(0)).wait();
      const [, , status] = await blindBook.getOrderInfo(0);
      expect(status).to.equal(Status.CANCELLED);
    });

    it("should prevent others from cancelling", async function () {
      const { encAmount, encPrice } = await encryptOrder(buyerClient, 100n, 5000n);
      await (await blindBook.connect(buyer).submitOrder(Side.BUY, encAmount, encPrice)).wait();
      await expect(blindBook.connect(seller).cancelOrder(0)).to.be.revertedWith("Not your order");
    });
  });

  describe("Calldata privacy", function () {
    // Proof that plaintext values never appear in the transaction calldata.
    // A front-runner scanning the mempool sees opaque ciphertext + proof, not "100" or "5000".
    it("should not contain plaintext amount/price in calldata", async function () {
      const amount = 12345n;
      const price = 98765n;
      const { encAmount, encPrice } = await encryptOrder(buyerClient, amount, price);

      const iface = blindBook.interface;
      const data: string = iface.encodeFunctionData("submitOrder", [Side.BUY, encAmount, encPrice]);

      // Render the plaintext values as 32-byte hex words the way they would appear
      // if submitted directly as uint64 arguments, and assert they do not appear.
      const amountHex = amount.toString(16).padStart(64, "0");
      const priceHex = price.toString(16).padStart(64, "0");
      expect(data.toLowerCase()).to.not.include(amountHex);
      expect(data.toLowerCase()).to.not.include(priceHex);
    });
  });
});
