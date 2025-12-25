// app/contact/page.tsx
import Link from "next/link";
import { Play, Users, Target, Rocket, Trophy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Top Bar */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/hooptubericon2.png"
              alt="HoopTuber Logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
            <span className="text-xl font-bold text-gray-900">HoopTuber</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-gray-600 hover:text-orange-500">
              Home
            </Link>
            <Link href="/about" className="text-gray-900 font-medium">
              About Us
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-orange-500">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Team */}
      <section className="py-14 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Meet the HoopTuber Team</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Ali Chishti",
                role: "Founder",
                img: "/placeholder-user.jpg",
              },
              {
                name: "Chris Alpuerto",
                role: "Founding Developer",
                img: "/placeholder-user.jpg",
              },
              {
                name: "Chris Kyle Napuli",
                role: "Founding Developer",
                img: "/placeholder-user.jpg",
              },
            ].map((m) => (
              <Card key={m.name} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-video bg-gray-100">
                    {/* Replace with real headshots under /public/team/*.jpg */}
                    <img
                      src={m.img}
                      alt={m.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-gray-900">{m.name}</div>
                    <div className="text-gray-600 text-sm">{m.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-4 bg-orange-500 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Want to partner or coach?</h2>
          <p className="text-lg opacity-90 mb-6">
            We collaborate with teams, trainers, tournaments, and especially hoopers.
          </p>
          <a href="mailto:christian@hooptuber.com, ali@hooptuber.com, chris@hooptuber.com">
            <Button variant="secondary" className="text-gray-900">
              <Mail className="w-5 h-5 mr-2" />
              Email the Team
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 px-4">
        <div className="container mx-auto text-center text-gray-400">
          © {new Date().getFullYear()} HoopTuber. All rights reserved.
        </div>
      </footer>
    </main>
  );
}