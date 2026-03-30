import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [menuOpen, setMenuOpen] = useState(false)

  const formatAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="BlindBook logo"
            className="w-10 h-10 object-contain"
          />
          <span className="text-[16px] font-black uppercase tracking-[-0.5px] text-white">
            BlindBook
          </span>
        </div>

        {/* Nav Links - Desktop */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#orders" className="text-[14px] font-semibold uppercase tracking-wide text-[#94a3b8] hover:text-white transition-colors duration-200">
            Orders
          </a>
          <a href="#match" className="text-[14px] font-semibold uppercase tracking-wide text-[#94a3b8] hover:text-white transition-colors duration-200">
            Match
          </a>
          <a href="#about" className="text-[14px] font-semibold uppercase tracking-wide text-[#94a3b8] hover:text-white transition-colors duration-200">
            About
          </a>
        </nav>

        {/* Wallet / Mobile Menu */}
        <div className="flex items-center gap-4">
          {isConnected ? (
            <button
              onClick={() => disconnect()}
              className="bg-white border-2 border-[#e2e8f0] text-[#0f172a] font-bold text-[14px] py-2 px-5 rounded-2xl hover:border-[#cbd5e1] hover:bg-[#fafafa] transition-colors duration-200"
            >
              {formatAddr(address!)}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="bg-[#b6ff5c] text-[#0f172a] font-black text-[14px] uppercase py-3 px-6 rounded-[24px] hover:bg-[#a5ed4b] transition-colors duration-200 shadow-[0px_4px_12px_rgba(182,255,92,0.3)]"
            >
              Connect Wallet
            </button>
          )}
          <button
            className="md:hidden text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <nav className="md:hidden px-6 pb-4 flex flex-col gap-4">
          <a href="#orders" className="text-[14px] font-semibold uppercase tracking-wide text-[#94a3b8]">Orders</a>
          <a href="#match" className="text-[14px] font-semibold uppercase tracking-wide text-[#94a3b8]">Match</a>
          <a href="#about" className="text-[14px] font-semibold uppercase tracking-wide text-[#94a3b8]">About</a>
        </nav>
      )}
    </header>
  )
}
