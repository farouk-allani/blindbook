import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { Zap, Loader2, CheckCircle, Unlock } from 'lucide-react'
import { BLINDBOOK_ADDRESS, BLINDBOOK_ABI } from '../config/contract'

// Arbitrum Sepolia base fees move between estimate and submission, so wagmi's
// maxFeePerGas occasionally lands a few wei below the current baseFee. Surface
// a plain "retry" message instead of a raw RPC error.
function friendlyTxError(err: unknown): string | null {
  if (!err) return null
  const msg = err instanceof Error ? err.message : String(err)
  if (/max fee per gas less than block base fee|maxFeePerGas/i.test(msg)) {
    return 'Arbitrum Sepolia base fee moved between estimate and submission. Just click again — it almost always works on retry.'
  }
  if (/user rejected|user denied/i.test(msg)) {
    return 'Transaction rejected in wallet.'
  }
  // Keep it short for unknown errors
  return msg.split('\n')[0].slice(0, 240)
}

export default function MatchPanel() {
  const [buyId, setBuyId] = useState('')
  const [sellId, setSellId] = useState('')
  const [revealFillQty, setRevealFillQty] = useState('')

  const { writeContract: writeMatch, data: matchHash, isPending: isMatchPending, error: matchError, reset: resetMatch } = useWriteContract()
  const { writeContract: writeReveal, data: revealHash, isPending: isRevealPending, error: revealError, reset: resetReveal } = useWriteContract()

  const { isLoading: isMatchConfirming, isSuccess: isMatchSuccess } = useWaitForTransactionReceipt({ hash: matchHash })
  const { isLoading: isRevealConfirming, isSuccess: isRevealSuccess } = useWaitForTransactionReceipt({ hash: revealHash })

  const { data: totalMatches } = useReadContract({
    address: BLINDBOOK_ADDRESS,
    abi: BLINDBOOK_ABI,
    functionName: 'totalMatches',
  })

  const handleMatch = () => {
    if (!buyId || !sellId) return
    resetMatch()
    writeMatch({
      address: BLINDBOOK_ADDRESS,
      abi: BLINDBOOK_ABI,
      functionName: 'matchOrders',
      args: [BigInt(buyId), BigInt(sellId)],
    })
  }

  const handleReveal = () => {
    if (!revealFillQty) return
    resetReveal()
    writeReveal({
      address: BLINDBOOK_ADDRESS,
      abi: BLINDBOOK_ABI,
      functionName: 'revealFill',
      args: [BigInt(Number(totalMatches || 1) - 1), BigInt(revealFillQty)],
    })
  }

  const matchErrMsg = friendlyTxError(matchError)
  const revealErrMsg = friendlyTxError(revealError)

  return (
    <section id="match" className="py-20">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/5 border-2 border-white/10 rounded-[24px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="w-6 h-6 text-[#a183ff]" strokeWidth={2.5} />
              <h3 className="text-[24px] font-black uppercase text-white tracking-[-0.5px]">Match Orders</h3>
              {totalMatches !== undefined && (
                <span className="bg-[#a183ff] text-white text-[12px] font-bold uppercase px-3 py-1 rounded-full tracking-wider">
                  {Number(totalMatches)} matches
                </span>
              )}
            </div>

            <p className="text-[14px] text-[#94a3b8] mb-6">
              The contract computes matches using{' '}
              <code className="text-[#b6ff5c] bg-[#b6ff5c]/10 px-2 py-0.5 rounded text-[12px]">FHE.lt</code>,{' '}
              <code className="text-[#b6ff5c] bg-[#b6ff5c]/10 px-2 py-0.5 rounded text-[12px]">FHE.min</code>,{' '}
              <code className="text-[#b6ff5c] bg-[#b6ff5c]/10 px-2 py-0.5 rounded text-[12px]">FHE.select</code>.
              Neither order's amount or price is revealed.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[14px] font-bold uppercase tracking-wide text-[#94a3b8] block mb-2">Buy Order ID</label>
                <input type="number" value={buyId} onChange={(e) => setBuyId(e.target.value)} placeholder="e.g. 0"
                  className="w-full px-4 py-4 bg-white border-2 border-[#e2e8f0] rounded-2xl text-[#0f172a] text-[16px] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#b6ff5c] transition-colors duration-200" />
              </div>
              <div>
                <label className="text-[14px] font-bold uppercase tracking-wide text-[#94a3b8] block mb-2">Sell Order ID</label>
                <input type="number" value={sellId} onChange={(e) => setSellId(e.target.value)} placeholder="e.g. 1"
                  className="w-full px-4 py-4 bg-white border-2 border-[#e2e8f0] rounded-2xl text-[#0f172a] text-[16px] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#b6ff5c] transition-colors duration-200" />
              </div>
            </div>

            <button onClick={handleMatch} disabled={!buyId || !sellId || isMatchPending || isMatchConfirming}
              className="w-full bg-[#a183ff] text-white font-black text-[16px] uppercase py-4 rounded-[24px] hover:bg-[#9170ee] transition-colors duration-200 shadow-[0px_4px_12px_rgba(161,131,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isMatchPending || isMatchConfirming ? (
                <><Loader2 className="w-5 h-5 animate-spin" />{isMatchPending ? 'Confirm...' : 'Matching...'}</>
              ) : isMatchSuccess ? (
                <><CheckCircle className="w-5 h-5" />Matched!</>
              ) : (
                <><Zap className="w-5 h-5" />Match Orders</>
              )}
            </button>

            {matchHash && (
              <a href={`https://sepolia.arbiscan.io/tx/${matchHash}`} target="_blank" rel="noopener noreferrer"
                className="block text-center text-[12px] text-[#a183ff] mt-3 hover:underline">View on Arbiscan →</a>
            )}

            {matchErrMsg && (
              <div className="mt-4 bg-[rgba(239,68,68,0.1)] border-2 border-[rgba(239,68,68,0.3)] rounded-2xl p-4">
                <p className="text-[12px] text-[#fca5a5] leading-[18px]">{matchErrMsg}</p>
              </div>
            )}
          </div>

          <div className="bg-white/5 border-2 border-white/10 rounded-[24px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <Unlock className="w-6 h-6 text-[#b6ff5c]" strokeWidth={2.5} />
              <h3 className="text-[24px] font-black uppercase text-white tracking-[-0.5px]">Reveal Fill</h3>
            </div>

            <p className="text-[14px] text-[#94a3b8] mb-6">
              After matching, enter the fill quantity to reveal. In production, this value is decrypted
              from the encrypted match result via Cofhe SDK.
            </p>

            <div className="mb-6">
              <label className="text-[14px] font-bold uppercase tracking-wide text-[#94a3b8] block mb-2">Fill Quantity</label>
              <input type="number" value={revealFillQty} onChange={(e) => setRevealFillQty(e.target.value)} placeholder="e.g. 50"
                className="w-full px-4 py-4 bg-white border-2 border-[#e2e8f0] rounded-2xl text-[#0f172a] text-[16px] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#b6ff5c] transition-colors duration-200" />
            </div>

            <button onClick={handleReveal} disabled={!revealFillQty || isRevealPending || isRevealConfirming}
              className="w-full bg-white border-2 border-[#e2e8f0] text-[#0f172a] font-bold text-[14px] uppercase py-4 rounded-2xl hover:border-[#cbd5e1] hover:bg-[#fafafa] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isRevealPending || isRevealConfirming ? (
                <><Loader2 className="w-5 h-5 animate-spin" />Revealing...</>
              ) : isRevealSuccess ? (
                <><CheckCircle className="w-5 h-5" />Revealed!</>
              ) : (
                <><Unlock className="w-5 h-5" />Reveal Last Match</>
              )}
            </button>

            {revealHash && (
              <a href={`https://sepolia.arbiscan.io/tx/${revealHash}`} target="_blank" rel="noopener noreferrer"
                className="block text-center text-[12px] text-[#a183ff] mt-3 hover:underline">View on Arbiscan →</a>
            )}

            {revealErrMsg && (
              <div className="mt-4 bg-[rgba(239,68,68,0.1)] border-2 border-[rgba(239,68,68,0.3)] rounded-2xl p-4">
                <p className="text-[12px] text-[#fca5a5] leading-[18px]">{revealErrMsg}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
