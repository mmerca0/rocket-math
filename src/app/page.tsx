import { site } from "@/config/site";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <h1 className="text-center text-4xl font-semibold tracking-tight">
        {site.name}
      </h1>
    </main>
  );
}
