import SearchForm from '../components/search/SearchForm';

export default function HomePage() {
  return (
    <main
      className="relative isolate min-h-[calc(100vh-4rem)] bg-cover bg-[position:center_58%]"
      style={{ backgroundImage: "url('/images/train-hero.jpg')" }}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-50/95 via-slate-50/85 to-slate-50/20" aria-hidden="true" />

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center gap-8 px-4 py-10 sm:px-6">
        <header className="max-w-4xl">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Your Journey, <span className="text-accent-700">Made Simple</span>
          </h1>
          <p className="mt-3 text-base font-medium text-slate-700 sm:text-lg">
            Find a train and plan your next journey.
          </p>
        </header>

        <section className="w-full max-w-5xl rounded-2xl border border-white/80 bg-slate-50/95 p-4 shadow-2xl backdrop-blur-sm sm:p-7 lg:p-8">
          <SearchForm hero />
        </section>
      </div>
    </main>
  );
}
