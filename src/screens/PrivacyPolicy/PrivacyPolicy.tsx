import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";

export const PrivacyPolicy = (): JSX.Element => {
  return (
    <div className="bg-[#e9e8dc] flex flex-row justify-center w-full min-h-screen">
      <div className="bg-[#e9e8dc] w-full max-w-[1512px] relative py-6">
        {/* Header */}
        <header className="flex justify-between items-center px-6 mb-16">
          <Link to="/">
            <img
              className="w-[67px] h-[58px] object-cover"
              alt="Endastlogga"
              src="/endastlogga-1.png"
            />
          </Link>
          <Link to="/basketball-clubs" className="font-['Sora',Helvetica] font-normal text-[#1e2321] text-3xl hover:underline">
            Basketball clubs
          </Link>
        </header>

        {/* Main Content */}
        <main className="px-6">
          <div className="max-w-[1440px] mx-auto">
            <h1 className="font-['Sora',Helvetica] font-semibold text-[50px] tracking-[5.00px] leading-[50px] text-[#1e2321] mb-12">
              Privacy Policy
            </h1>

            <div className="prose prose-lg max-w-none">
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-lg mb-6">
                This Privacy Policy describes how Amir Performance Technology AB ("we," "us," or "our") collects, uses, and shares your personal information when you use our mobile application and related services (collectively, the "Services").
              </p>

              <h2 className="font-['Sora',Helvetica] font-semibold text-[32px] text-[#1e2321] mt-12 mb-6">
                Information We Collect
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-lg mb-6">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-8 mb-6 font-['Sora',Helvetica] text-[#1e2321] text-lg">
                <li>Account information (name, email address, password)</li>
                <li>Profile information (age, height, weight, position)</li>
                <li>Training data and performance metrics</li>
                <li>Communications with us</li>
              </ul>

              <h2 className="font-['Sora',Helvetica] font-semibold text-[32px] text-[#1e2321] mt-12 mb-6">
                How We Use Your Information
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-lg mb-6">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-8 mb-6 font-['Sora',Helvetica] text-[#1e2321] text-lg">
                <li>Provide, maintain, and improve our Services</li>
                <li>Process your transactions</li>
                <li>Send you technical notices and support messages</li>
                <li>Communicate with you about products, services, and events</li>
                <li>Monitor and analyze trends and usage</li>
                <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
                <li>Protect our rights and property</li>
              </ul>

              <h2 className="font-['Sora',Helvetica] font-semibold text-[32px] text-[#1e2321] mt-12 mb-6">
                Information Sharing
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-lg mb-6">
                We do not share your personal information with third parties except as described in this policy. We may share your information with:
              </p>
              <ul className="list-disc pl-8 mb-6 font-['Sora',Helvetica] text-[#1e2321] text-lg">
                <li>Service providers who assist in our operations</li>
                <li>Professional advisors</li>
                <li>Law enforcement or other authorities when required by law</li>
              </ul>

              <h2 className="font-['Sora',Helvetica] font-semibold text-[32px] text-[#1e2321] mt-12 mb-6">
                Your Rights
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-lg mb-6">
                You have the right to:
              </p>
              <ul className="list-disc pl-8 mb-6 font-['Sora',Helvetica] text-[#1e2321] text-lg">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Object to processing of your information</li>
                <li>Request restrictions on processing</li>
              </ul>

              <h2 className="font-['Sora',Helvetica] font-semibold text-[32px] text-[#1e2321] mt-12 mb-6">
                Contact Us
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-lg mb-6">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-lg mb-2">
                Amir Performance Technology AB
              </p>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-lg mb-2">
                Kungsgatan 50
              </p>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-lg mb-2">
                41115, Göteborg
              </p>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-lg mb-6">
                Email: info@amirperformance.com
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Card className="mt-16 w-full rounded-none bg-[#f2f2ec] bg-opacity-50 border-none">
          <CardContent className="p-6">
            <h3 className="font-['Sora',Helvetica] font-semibold text-[#1e2321] text-[22px] mb-4">
              Contact
            </h3>
            <p className="font-['Sora',Helvetica] font-medium text-[#1e2321] text-lg mb-4">
              Amir Performance Technology AB
            </p>
            <a
              className="font-['Sora',Helvetica] font-medium text-[#1e2321] text-lg underline block mb-4"
              href="mailto:info@amirperformance.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              info@amirperformance.com
            </a>
            <p className="font-['Sora',Helvetica] font-medium text-[#1e2321] text-lg mb-1">
              Kungsgatan 50
            </p>
            <p className="font-['Sora',Helvetica] font-medium text-[#1e2321] text-lg mb-4">
              41115, Göteborg
            </p>

            <div className="flex justify-end">
              <div className="space-y-2">
                <Link
                  to="/privacy-policy"
                  className="font-['Sora',Helvetica] font-medium text-[#1e2321] text-lg underline block"
                >
                  Privacy policy
                </Link>
                <a
                  href="#"
                  className="font-['Sora',Helvetica] font-medium text-[#1e2321] text-lg underline block"
                >
                  Terms of use
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};