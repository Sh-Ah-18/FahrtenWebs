import { redirect } from "next/navigation"

export default function DashboardIndex() {
  console.log("Dashboard group index page")
  redirect("/dashboard")
}
