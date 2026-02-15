import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as string
    const name = formData.get("name") as string | null

    const apiKey = process.env.IMGBB_API_KEY || "d849f711219cd45ef8704a15b604f9b7"

    // Create form data for ImgBB
    const imgbbFormData = new FormData()
    imgbbFormData.append("image", image)
    if (name) {
      imgbbFormData.append("name", name)
    }

    // Upload to ImgBB
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: imgbbFormData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("ImgBB API error:", errorData)
      return NextResponse.json(
        { error: errorData.error?.message || "فشل رفع الصورة إلى ImgBB" },
        { status: response.status },
      )
    }

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json({ error: "فشل رفع الصورة" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in upload-image API:", error)
    return NextResponse.json({ error: error.message || "حدث خطأ في السيرفر" }, { status: 500 })
  }
}
