export const maxDuration = 60

const SYSTEM_PROMPT_AR = `
أنت "مساعد منصة التخرج" - المساعد الذكي الرسمي لنظام إدارة مشاريع التخرج الجامعية.
أجب بوضوح، بتنظيم، وبشكل احترافي.
`

const SYSTEM_PROMPT_EN = `
You are "GP Platform Assistant" - the official AI assistant for the Graduation Projects Management System.
Answer clearly, structured, and professionally.
`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, language = "ar" } = body

    if (!process.env.DEEPSEEK_API_KEY) {
      console.error("❌ DEEPSEEK_API_KEY is missing")
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500 }
      )
    }

    const systemPrompt =
      language === "ar" ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_EN

    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("DeepSeek API error:", errorText)
      return new Response(
        JSON.stringify({ error: errorText }),
        { status: 500 }
      )
    }

    const data = await response.json()

    const reply =
      data.choices?.[0]?.message?.content ||
      "No response received."

    return new Response(reply, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  } catch (error) {
    console.error("Server error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to get response from AI" }),
      { status: 500 }
    )
  }
}
