export const metadata = {
  title: "Sanity Studio",
  description: "Content management for Real Estate Platform",
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div style={{ margin: 0 }}>{children}</div>;
}
