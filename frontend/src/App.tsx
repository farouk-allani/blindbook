import Header from './components/Header'
import Hero from './components/Hero'
import OrderForm from './components/OrderForm'
import OrderBook from './components/OrderBook'
import MatchPanel from './components/MatchPanel'

function App() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Header />
      <Hero />
      <OrderForm />
      <OrderBook />
      <MatchPanel />

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <p className="text-[14px] text-[#64748b] mb-2">
            BlindBook — Encrypted On-Chain Order Book
          </p>
          <p className="text-[12px] text-[#475569]">
            Built on Ethereum Sepolia with FHE · Fhenix Buildathon 2026
          </p>
          <div className="flex justify-center gap-6 mt-6">
            <a
              href="https://sepolia.arbiscan.io/address/0x0f41Dc668024F5C98B9835EbEcb63Cf9ad2E4e0a"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-bold uppercase tracking-wider text-[#a183ff] hover:text-[#b6ff5c] transition-colors duration-200"
            >
              Contract
            </a>
            <a
              href="https://docs.fhenix.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-bold uppercase tracking-wider text-[#a183ff] hover:text-[#b6ff5c] transition-colors duration-200"
            >
              Fhenix Docs
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-bold uppercase tracking-wider text-[#a183ff] hover:text-[#b6ff5c] transition-colors duration-200"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
