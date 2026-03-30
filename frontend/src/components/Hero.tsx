import { Eye, EyeOff, Zap } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute top-20 -left-32 w-[500px] h-[500px] bg-[rgba(182,255,92,0.08)] blur-[80px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[rgba(161,131,255,0.06)] blur-[80px] rounded-full" />

      <div className="relative max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#b6ff5c]">
                FHE-Powered Privacy
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-[48px] md:text-[72px] leading-[48px] md:leading-[72px] font-black uppercase tracking-[-0.5px] max-w-[800px] mb-6">
              Your Orders Are{' '}
              <span className="bg-[#b6ff5c] px-3 py-1 rounded-2xl inline-block">
                <span className="text-[#0f172a]">Invisible</span>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[18px] leading-[28px] text-[#94a3b8] max-w-[520px] mb-10">
              The first encrypted order book on-chain. Order amounts and prices stay encrypted using FHE.
              Front-running is mathematically impossible.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <EyeOff className="w-5 h-5 text-[#b6ff5c]" strokeWidth={2} />
                <span className="text-[14px] font-bold text-white">Hidden Orders</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <Zap className="w-5 h-5 text-[#a183ff]" strokeWidth={2} />
                <span className="text-[14px] font-bold text-white">Zero MEV</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <Eye className="w-5 h-5 text-[#b6ff5c]" strokeWidth={2} />
                <span className="text-[14px] font-bold text-white">Verifiable Settlement</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex justify-end">
            <img
              src="/logo.png"
              alt="BlindBook logo"
              className="w-[320px] h-[320px] object-contain opacity-95"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
