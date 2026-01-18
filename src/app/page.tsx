import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Background animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--primary)] opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--secondary)] opacity-10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl animate-fadeIn">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] mb-6 shadow-2xl">
            <span className="text-5xl">🚴</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[var(--primary-light)] to-[var(--secondary)] bg-clip-text text-transparent">
            BMX Flatland
          </h1>
          <p className="text-xl text-[var(--text-muted)]">
            ジャッジ＆観客投票システム
          </p>
        </div>

        {/* Description */}
        <p className="text-[var(--text-muted)] mb-12 text-lg">
          技術評価と盛り上がり評価を統合した<br />
          公平・透明・エンタメ性を両立したスコアリングシステム
        </p>

        {/* Navigation Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Audience */}
          <Link href="/audience" className="group">
            <div className="card p-6 hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--secondary)] to-amber-600 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                <span className="text-3xl">🎉</span>
              </div>
              <h2 className="text-xl font-bold mb-2">観客用</h2>
              <p className="text-[var(--text-muted)] text-sm">
                選手に投票して<br />盛り上がりを評価！
              </p>
            </div>
          </Link>

          {/* Judge */}
          <Link href="/judge" className="group">
            <div className="card p-6 hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                <span className="text-3xl">📋</span>
              </div>
              <h2 className="text-xl font-bold mb-2">ジャッジ用</h2>
              <p className="text-[var(--text-muted)] text-sm">
                技術評価項目を<br />採点
              </p>
            </div>
          </Link>

          {/* Admin */}
          <Link href="/admin" className="group">
            <div className="card p-6 hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-emerald-600 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                <span className="text-3xl">⚙️</span>
              </div>
              <h2 className="text-xl font-bold mb-2">運営用</h2>
              <p className="text-[var(--text-muted)] text-sm">
                大会管理・<br />スコア集計
              </p>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-12 text-[var(--text-muted)] text-sm">
          BMX Flatland Judge & Voting System v1.0
        </p>
      </div>
    </div>
  );
}
