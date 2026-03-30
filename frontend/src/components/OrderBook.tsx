import { useReadContract, useReadContracts } from 'wagmi'
import { EyeOff, RefreshCw } from 'lucide-react'
import { BLINDBOOK_ADDRESS, BLINDBOOK_ABI } from '../config/contract'

const statusLabels = ['ACTIVE', 'FILLED', 'CANCELLED']
const sideLabels = ['BUY', 'SELL']

export default function OrderBook() {
  const { data: totalOrders, refetch } = useReadContract({
    address: BLINDBOOK_ADDRESS,
    abi: BLINDBOOK_ABI,
    functionName: 'totalOrders',
  })

  const orderCount = Number(totalOrders || 0)

  const orderCalls = Array.from({ length: orderCount }, (_, i) => ({
    address: BLINDBOOK_ADDRESS,
    abi: BLINDBOOK_ABI,
    functionName: 'getOrderInfo' as const,
    args: [BigInt(i)] as const,
  }))

  const { data: ordersData } = useReadContracts({
    contracts: orderCalls,
    query: { enabled: orderCount > 0 },
  })

  return (
    <section className="py-20">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="bg-white/5 border-2 border-white/10 rounded-[24px] p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <EyeOff className="w-6 h-6 text-[#b6ff5c]" strokeWidth={2.5} />
              <h3 className="text-[24px] font-black uppercase text-white tracking-[-0.5px]">Order Book</h3>
              <span className="bg-[#b6ff5c] text-[#0f172a] text-[12px] font-bold uppercase px-3 py-1 rounded-full tracking-wider">
                {orderCount} orders
              </span>
            </div>
            <button onClick={() => refetch()} className="flex items-center gap-2 text-[14px] font-bold text-[#94a3b8] hover:text-white transition-colors duration-200">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {orderCount === 0 ? (
            <div className="text-center py-12">
              <EyeOff className="w-12 h-12 text-[#334155] mx-auto mb-4" />
              <p className="text-[16px] text-[#64748b]">No orders yet. Submit one above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-white/10 mb-2">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#64748b]">Order ID</span>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#64748b]">Side</span>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#64748b]">Amount</span>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#64748b]">Price</span>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#64748b]">Status</span>
              </div>
              {ordersData?.map((order, i) => {
                if (!order.result) return null
                const [, side, status] = order.result as [string, number, number]
                return (
                  <div key={i} className="grid grid-cols-5 gap-4 px-4 py-4 border-b border-white/5 hover:bg-white/5 transition-colors duration-200 rounded-xl">
                    <span className="text-[14px] font-bold text-white">#{i}</span>
                    <span>
                      <span className={`text-[12px] font-bold uppercase px-3 py-1 rounded-full tracking-wider ${
                        side === 0 ? 'bg-[rgba(182,255,92,0.15)] text-[#b6ff5c]' : 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                      }`}>{sideLabels[side]}</span>
                    </span>
                    <span className="text-[14px] text-[#94a3b8]">encrypted</span>
                    <span className="text-[14px] text-[#94a3b8]">encrypted</span>
                    <span>
                      <span className={`text-[12px] font-bold uppercase px-3 py-1 rounded-full tracking-wider ${
                        status === 0 ? 'bg-[rgba(161,131,255,0.15)] text-[#a183ff]' :
                        status === 1 ? 'bg-[rgba(182,255,92,0.15)] text-[#b6ff5c]' :
                        'bg-[rgba(100,116,139,0.15)] text-[#64748b]'
                      }`}>{statusLabels[status]}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
