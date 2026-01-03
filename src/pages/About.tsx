import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

const teamMembers = [
  { name: 'Prince Kumar Verma', role: 'UI Designer' },
  { name: 'Abhijit Kushwaha', role: 'Backend Coder' },
  { name: 'Abhinav Bajpai', role: 'Marketing Team' },
  { name: 'Ananya Pandey', role: 'Customer Support & Marketing' },
  { name: 'Sakshi Yadav', role: 'Data Management Incharge' },
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
            <h1 className="text-2xl font-bold">About EduRank</h1>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            EduRank is an AI-powered study platform that transforms your learning experience. 
            We use advanced AI to find the best educational videos for your topics, generate 
            comprehensive notes, and create interactive quizzes to test your knowledge.
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
            <p className="text-muted-foreground">Have questions or feedback? Reach out to us!</p>
            <a 
              href="mailto:qbitworld018@gmail.com"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <Mail className="h-4 w-4" />
              qbitworld018@gmail.com
            </a>
          </div>
        </section>

        {/* Team Section */}
        <section className="glass-card rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Our Team</h2>
          </div>

          <div className="grid gap-4">
            {teamMembers.map((member, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;
