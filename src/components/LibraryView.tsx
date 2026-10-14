import CaseSelector from './CaseSelector';
import type { CaseSelectorProps } from './CaseSelector';
export default function LibraryView(props:CaseSelectorProps) {
  return <section className="h-full overflow-y-auto p-4 sm:p-6 space-y-5 max-w-[1500px] mx-auto"><header><h1 className="text-xl font-bold">Algorithm library</h1><p className="text-sm text-zinc-400 mt-1">41 F2L · 57 OLL · 21 PLL cases, grouped by recognition pattern. Choose alternates and add them to your training session.</p></header><CaseSelector {...props}/></section>;
}
