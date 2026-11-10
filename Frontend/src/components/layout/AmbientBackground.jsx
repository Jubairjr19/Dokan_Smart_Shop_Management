/**
 * Fixed backdrop: navy base, faint stars and large colour pools. These give the
 * glass panels something to refract; without them backdrop-blur looks flat.
 */
export default function AmbientBackground() {
  return (
    <div className="no-print pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-cosmos-950" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_800px_at_12%_-8%,#12275A_0%,transparent_65%),radial-gradient(1000px_700px_at_100%_0%,#0F1E4C_0%,transparent_60%),linear-gradient(180deg,#070D22_0%,#040817_100%)]" />
      <div className="absolute -left-40 top-[6%] h-[560px] w-[560px] rounded-full bg-brand-cyan/20 blur-[120px]" />
      <div className="absolute left-[38%] top-[32%] h-[480px] w-[620px] rounded-full bg-indigo-500/20 blur-[130px]" />
      <div className="absolute -right-32 top-[-10%] h-[440px] w-[520px] rounded-full bg-sky-500/[0.14] blur-[120px]" />
      <div className="absolute -bottom-40 right-[4%] h-[560px] w-[640px] rounded-full bg-brand-roof/[0.18] blur-[130px]" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,.5), transparent), radial-gradient(1px 1px at 140px 90px, rgba(255,255,255,.3), transparent), radial-gradient(1.500px 1.500px at 260px 170px, rgba(165,243,252,.45), transparent), radial-gradient(1px 1px at 330px 40px, rgba(255,255,255,.28), transparent), radial-gradient(1px 1px at 80px 240px, rgba(255,255,255,.3), transparent)',
          backgroundSize: '380px 300px',
        }}
      />
    </div>
  )
}
