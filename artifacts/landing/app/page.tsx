import { ChatInterface } from "@/components/chat-interface"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default function Home() {
  return (
    <div className="flex flex-col w-full min-h-dvh">
      <SiteHeader />
      <main className="flex w-full h-[calc(100dvh-3.5rem)]">
        <ChatInterface />
      </main>
      <SiteFooter />
    </div>
  )
}
