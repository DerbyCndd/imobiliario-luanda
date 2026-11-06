import Script from 'next/script';
import { SHELL } from './shell';

export default function Page() {
  return (
    <>
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SHELL }} />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
