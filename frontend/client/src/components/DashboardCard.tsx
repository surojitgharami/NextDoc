import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";

interface DashboardCardProps {
  title: string;
  description: string;
  href: string;
}

export default function DashboardCard({
  title,
  description,
  href,
}: DashboardCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card
      className="p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
      onClick={() => setLocation(href)}
    >
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}
