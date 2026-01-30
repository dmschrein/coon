import { QuizForm } from "@/components/quiz/quiz-form";

export default function QuizPage() {
  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">Onboarding Quiz</h1>
      <p className="text-zinc-500 mb-8">
        Tell us about your product and audience so we can help you build the
        right community.
      </p>
      <QuizForm />
    </div>
  );
}
