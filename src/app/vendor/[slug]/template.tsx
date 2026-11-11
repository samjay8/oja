/** Each desk tab settles in with a short fade on navigation. */
export default function DeskTemplate({ children }: { children: React.ReactNode }) {
  return <div className="fade flex flex-1 flex-col">{children}</div>;
}
