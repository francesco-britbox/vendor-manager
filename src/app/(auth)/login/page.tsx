import { Suspense } from "react";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
