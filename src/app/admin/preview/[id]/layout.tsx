export const metadata = {
  title: 'Prévisualisation du Quiz',
}

// Use a completely minimal layout that won't affect sidebar visibility
export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Remove any class that might affect the sidebar visibility
    <div>
      {children}
    </div>
  );
}
