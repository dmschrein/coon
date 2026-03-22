import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Persona } from "@/types";

interface PersonaCardProps {
  persona: Persona;
  index: number;
}

export function PersonaCard({ persona, index }: PersonaCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm">
            {index + 1}
          </span>
          {persona.name}
        </CardTitle>
        <CardDescription>{persona.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="mb-2 text-sm font-medium">Messaging Angle</h4>
          <p className="text-muted-foreground text-sm">
            {persona.messagingAngle}
          </p>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium">Goals</h4>
          <ul className="text-muted-foreground space-y-1 text-sm">
            {persona.goals.map((goal, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium">Pain Points</h4>
          <ul className="text-muted-foreground space-y-1 text-sm">
            {persona.painPoints.map((pain, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-destructive">•</span>
                <span>{pain}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium">Objections</h4>
          <ul className="text-muted-foreground space-y-1 text-sm">
            {persona.objections.map((objection, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>{objection}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
