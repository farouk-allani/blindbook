import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Lock, ArrowUp, ArrowDown, Loader2, CheckCircle, Fuel, X } from 'lucide-react'
import { BLINDBOOK_ADDRESS, BLINDBOOK_ABI } from '../config/contract'

export default function OrderForm() {
  const { isConnected } = useAccount()
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')
  const [toast, setToast] = useState<{ side: string; hash: string } | null>(null)

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Show toast + reset form on success
  useEffect(() => {
    if (isSuccess && hash) {
      setToast({ side, hash })
      setAmount('')
      setPrice('')
      // Auto-dismiss toast after 6 seconds
      const timer = setTimeout(() => setToast(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, hash])

  const handleSubmit = () => {
    if (!amount || !price) return
    writeContract({
      address: BLINDBOOK_ADDRESS,
      abi: BLINDBOOK_ABI,
      functionName: 'submitOrder',
      args: [side === 'BUY' ? 0 : 1, BigInt(amount), BigInt(price)],
    })
  }

  if (!isConnected) {
    return (
      <section id="orders" className="py-20">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="bg-white/5 border-2 border-white/10 rounded-[24px] p-12 text-center">
            <Lock className="w-12 h-12 text-[#94a3b8] mx-auto mb-4" />
            <h3 className="text-[24px] font-black uppercase text-white mb-2">Connect Your Wallet</h3>
            <p className="text-[16px] text-[#94a3b8]">Connect MetaMask on Arbitrum Sepolia</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="orders" className="py-20 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 right-6 z-50 animate-[slideIn_0.3s_ease-out]">
          <div className="bg-[#0f172a] border-2 border-[#b6ff5c] rounded-[24px] p-5 shadow-[0px_8px_32px_rgba(182,255,92,0.2)] min-w-[320px]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-[#b6ff5c] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-black uppercase text-[#b6ff5c] mb-1">
                    {toast.side} Order Submitted
                  </p>
                  <a
                    href={`https://sepolia.arbiscan.io/tx/${toast.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-[#a183ff] hover:underline"
                  >
                    View on Arbiscan →
                  </a>
                </div>
              </div>
              <button onClick={() => setToast(null)} className="text-[#64748b] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/5 border-2 border-white/10 rounded-[24px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <Lock className="w-6 h-6 text-[#b6ff5c]" strokeWidth={2.5} />
              <h3 className="text-[24px] font-black uppercase text-white tracking-[-0.5px]">Submit Order</h3>
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setSide('BUY')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 border-2 border-transparent rounded-2xl font-black text-[14px] uppercase transition-all duration-200 ${
                  side === 'BUY'
                    ? 'bg-[#b6ff5c] text-[#0f172a] shadow-[0px_4px_12px_rgba(182,255,92,0.3)]'
                    : 'bg-white/5 border-white/10 text-[#94a3b8] hover:border-[#b6ff5c]'
                }`}
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                Buy
              </button>
              <button
                onClick={() => setSide('SELL')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 border-2 border-transparent rounded-2xl font-black text-[14px] uppercase transition-all duration-200 ${
                  side === 'SELL'
                    ? 'bg-[#ef4444] text-white shadow-[0px_4px_12px_rgba(239,68,68,0.3)]'
                    : 'bg-white/5 border-white/10 text-[#94a3b8] hover:border-[#ef4444]'
                }`}
              >
                <ArrowDown className="w-4 h-4" strokeWidth={2.5} />
                Sell
              </button>
            </div>

            <div className="mb-4">
              <label className="text-[14px] font-bold uppercase tracking-wide text-[#94a3b8] block mb-2">
                Amount (units)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-4 py-4 bg-white border-2 border-[#e2e8f0] rounded-2xl text-[#0f172a] text-[16px] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#b6ff5c] transition-colors duration-200"
              />
              <p className="text-[12px] text-[#64748b] mt-1.5 px-1">
                How many units you want to {side === 'BUY' ? 'buy' : 'sell'}
              </p>
            </div>

            <div className="mb-6">
              <label className="text-[14px] font-bold uppercase tracking-wide text-[#94a3b8] block mb-2">
                Price per unit
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-4 py-4 bg-white border-2 border-[#e2e8f0] rounded-2xl text-[#0f172a] text-[16px] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#b6ff5c] transition-colors duration-200"
              />
              <p className="text-[12px] text-[#64748b] mt-1.5 px-1">
                {side === 'BUY' ? 'Max price you will pay' : 'Min price you will accept'}
              </p>
            </div>

            <div className="bg-[rgba(161,131,255,0.1)] border-2 border-[rgba(161,131,255,0.2)] rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#a183ff] mt-0.5 flex-shrink-0" strokeWidth={2} />
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wider text-[#a183ff] mb-1">FHE Encryption</p>
                  <p className="text-[12px] leading-[18px] text-[#94a3b8]">
                    Values are encrypted via <code className="text-[#b6ff5c]">FHE.asEuint64()</code> on-chain.
                    Matching uses <code className="text-[#b6ff5c]">FHE.lte</code>, <code className="text-[#b6ff5c]">FHE.min</code>, <code className="text-[#b6ff5c]">FHE.select</code> on encrypted state.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!amount || !price || isPending || isConfirming}
              className="w-full bg-[#b6ff5c] text-[#0f172a] font-black text-[16px] uppercase py-4 rounded-[24px] hover:bg-[#a5ed4b] transition-colors duration-200 shadow-[0px_4px_12px_rgba(182,255,92,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isPending ? 'Confirm in Wallet...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Submit {side} Order
                </>
              )}
            </button>

            <div className="bg-white/5 border-2 border-white/10 rounded-2xl p-4 mt-6">
              <div className="flex items-start gap-3">
                <Fuel className="w-5 h-5 text-[#94a3b8] mt-0.5 flex-shrink-0" strokeWidth={2} />
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1">Arbitrum Sepolia ETH</p>
                  <p className="text-[12px] leading-[18px] text-[#64748b]">
                    You need Arbitrum Sepolia ETH for gas.{' '}
                    <a href="https://www.alchemy.com/faucets/arbitrum-sepolia" target="_blank" rel="noopener noreferrer" className="text-[#a183ff] underline">
                      Get free ETH
                    </a>.
                    {' '}If gas fee error appears, just retry — base fee fluctuates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0f172a] border-2 border-white/10 rounded-[24px] p-8">
            <h3 className="text-[24px] font-black uppercase text-white tracking-[-0.5px] mb-8">
              How FHE Matching Works
            </h3>
            <div className="space-y-6">
              <Step number={1} title="Submit" desc="Your amount and price are encrypted on-chain via FHE.asEuint64(). The contract stores euint64 ciphertext — not readable numbers." />
              <Step number={2} title="Match" desc="FHE.lte(sellPrice, buyPrice) checks compatibility. FHE.min(buyAmt, sellAmt) computes fill. FHE.select applies the result. All on encrypted data." />
              <Step number={3} title="Reveal" desc="Only matched counterparties decrypt fill details. The public sees that a match happened — not the amounts or prices." />
              <Step number={4} title="Settle" desc="Funds settle. Losing orders stay encrypted forever. No front-running. No information leakage." />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Step({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 bg-[#b6ff5c] rounded-[20px] flex items-center justify-center flex-shrink-0">
        <span className="text-[16px] font-black text-[#0f172a]">{number}</span>
      </div>
      <div>
        <h4 className="text-[16px] font-black uppercase text-white mb-1">{title}</h4>
        <p className="text-[14px] leading-[20px] text-[#94a3b8]">{desc}</p>
      </div>
    </div>
  )
}
