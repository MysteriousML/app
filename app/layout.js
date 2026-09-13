export const metadata = {
  title: "Script Drop",
  description: "Upload and share scripts from the web or Discord",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
