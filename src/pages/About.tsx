import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

const teamMembers = [
  { name: 'Abhijit Kushwaha', role: 'Backend Coder & Integrator' },
  { name: 'Prince Kumar Verma', role: 'UI Designer & Game Developer' },
  { name: 'Dewashish Kesharwani', role: 'Backend Coder & Game Developer' },
  { name: 'Abhinav Bajpai', role: 'Researcher, Marketing & Data Management' },
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

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">Who We Are</h2>
              <p className="text-muted-foreground leading-relaxed">
                Brain Buddy is an educational platform built with the vision of improving how students learn using structured guidance and technology. What started as curiosity slowly turned into a mission to create smarter, more efficient learning experiences.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Our Core Team</h2>
              <div className="space-y-2 text-muted-foreground">
                <p>Abhijit Kushwaha – Backend Coder & Integrator</p>
                <p>Prince Kumar Verma – UI Designer & Game Developer</p>
                <p>Dewashish Kesharwani – Backend Coder & Game Developer</p>
                <p>Abhinav Bajpai – Researcher, Marketing & Data Management</p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">The Journey of Building Brain Buddy</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>Brain Buddy began as a simple idea at home — a vision to improve how students learn using structured guidance and technology.</p>
                <p>We shared the idea with our class teacher, Swati Singh, who listened carefully and encouraged us to move forward.</p>
                <p>Later, we met the school leadership:</p>
                <div className="ml-4">
                  <p>Swati S. Shaligram – Principal</p>
                  <p>Kabir Ahmed – Vice Principal</p>
                </div>
                <p>They understood our goals and supported us instead of dismissing us as "just students."</p>
                <p>With guidance from our IT teachers, Mridul Sir and Meenu Ma'am, and access to school resources, we worked continuously — debugging, redesigning, refining — until BrainBuddy became a real educational platform.</p>
                <p className="italic">Brain Buddy is built not just with code, but with belief and determination.</p>
              </div>
            </div>

            {/* Journey Timeline Image */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <img 
                src="/brain-buddy-journey.png" 
                alt="The Journey of Building Brain Buddy - Timeline" 
                className="w-full rounded-xl shadow-lg"
              />
            </div>
          </div>
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
