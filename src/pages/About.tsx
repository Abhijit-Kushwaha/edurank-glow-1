import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Users, Sparkles, Heart, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

import Roadmap from "@/assets/BRAIN BUDDY Development Roadmap (1) 1.png";
import AbhijitImage from "@/assets/Core Team pic/Abhijit Kushwaha.jpg";

const teamMembers = [
  { name: "Abhijit Kushwaha", role: "Backend Coder & Integrator" },
  { name: "Prince Kumar Verma", role: "UI Designer & Game Developer" },
  { name: "Dewashish Kesharwani", role: "Backend Coder & Game Developer" },
  { name: "Abhinav Bajpai", role: "Researcher, Marketing & Data Management" },
];

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* About Section */}
        <section className="glass-card rounded-2xl p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">About Us</h1>
          </div>

          <h2 className="text-xl font-semibold mb-3">Who We Are</h2>
          <p className="text-muted-foreground leading-relaxed">
            Brain Buddy is an educational platform built with the vision of
            improving how students learn using structured guidance and
            technology. What started as curiosity slowly turned into a mission
            to create smarter, more efficient learning experiences.
          </p>
        </section>

        {/* Team Section */}
        <section className="glass-card rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Our Core Team</h2>
          </div>

          <div className="grid gap-4">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {member.name === "Abhijit Kushwaha" ? (
                      <img
                        src={AbhijitImage}
                        alt="Abhijit Kushwaha"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-primary font-semibold">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Journey Section */}
        <section className="glass-card rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Map className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">
              The Journey of Building Brain Buddy
            </h2>
          </div>

          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Brain Buddy began as a simple idea at home — a vision to improve
              how students learn using structured guidance and technology.
            </p>
            <p>
              We shared the idea with our class teacher,{" "}
              <span className="font-medium text-foreground">Swati Singh</span>,
              who listened carefully and encouraged us to move forward.
            </p>
            <p>Later, we met the school leadership:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <span className="font-medium text-foreground">
                  Swati S. Shaligram
                </span>{" "}
                – Principal
              </li>
              <li>
                <span className="font-medium text-foreground">Kabir Ahmed</span>{" "}
                – Vice Principal
              </li>
            </ul>
            <p>
              They understood our goals and supported us instead of dismissing
              us as "just students."
            </p>
            <p>
              With guidance from our IT teachers,{" "}
              <span className="font-medium text-foreground">Mridul Sir</span>{" "}
              and{" "}
              <span className="font-medium text-foreground">Meenu Ma'am</span>,
              and access to school resources, we worked continuously —
              debugging, redesigning, refining — until BrainBuddy became a real
              educational platform.
            </p>
            <p className="font-medium text-foreground italic">
              Brain Buddy is built not just with code, but with belief and
              determination.
            </p>
          </div>
        </section>

        {/* Special Thanks */}
        <section className="glass-card rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Special Thanks</h2>
          </div>
          <p className="text-muted-foreground font-medium text-center text-lg py-2">
            SPECIAL THANKS TO VIDYAGYAN SCHOOL FOR SUPPORTING US.
          </p>
        </section>

        {/* Contact Section */}
        <section className="glass-card rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Contact Us</h2>
          </div>

          <div className="space-y-3">
            <p className="text-muted-foreground">
              Have questions or feedback? Reach out to us!
            </p>
            <a
              href="mailto:qbitworld018@gmail.com"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <Mail className="h-4 w-4" />
              qbitworld018@gmail.com
            </a>
          </div>
        </section>

        {/* Roadmap Image Section */}
        <section className="glass-card rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Map className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Our Roadmap</h2>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <div className="rounded-xl overflow-hidden border border-border/50 cursor-pointer">
                <img
                  src={Roadmap}
                  alt="Brain Buddy Development Roadmap"
                  className="w-full"
                />
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <img
                src={Roadmap}
                alt="Brain Buddy Development Roadmap"
                className="w-full"
              />
            </DialogContent>
          </Dialog>
        </section>
      </main>
    </div>
  );
};

export default About;
