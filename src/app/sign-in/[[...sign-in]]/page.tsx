import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <main className="mx-auto flex min-h-[60vh] items-center justify-center px-5 py-12"><SignIn routing="path" path="/sign-in" /></main>;
}
