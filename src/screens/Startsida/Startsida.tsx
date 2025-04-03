import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";

export const Startsida = (): JSX.Element => {
  return (
    <div className="bg-[#e9e8dc] flex flex-row justify-center w-full min-h-screen">
      <div className="bg-[#e9e8dc] w-full max-w-[1512px] relative py-6">
        {/* Header */}
        <header className="flex justify-between items-center px-6 mb-16">
          <img
            className="w-[67px] h-[58px] object-cover"
            alt="Endastlogga"
            src="/endastlogga-1.png"
          />
          <Link to="/basketball-clubs" className="font-['Sora',Helvetica] font-normal text-[#1e2321] text-3xl hover:underline">
            Basketball clubs
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex flex-col md:flex-row px-6 gap-8">
          {/* Left Column - Text Content */}
          <div className="flex-1">
            <h1 className="font-['Sora',Helvetica] font-semibold text-[50px] tracking-[5.00px] leading-[50px] text-[#1e2321] mb-6">
              AMIR PERFORMANCE
            </h1>
            <h2 className="font-['Sora',Helvetica] font-normal text-[#1e2321] text-[40px] tracking-[4.00px] leading-10 mb-8 max-w-[586px]">
              Off-season &amp; in-season training that transfers to the court
            </h2>
            <p className="font-['Sora',Helvetica] font-normal text-[#1e2321] text-[22px] tracking-[2.20px] leading-[22px] mb-12 max-w-[645px]">
              Amir Performance is a training app specifically designed for
              basketball players of all levels.
            </p>

            {/* App Store Buttons */}
            <div className="flex gap-4 mb-12">
              <img
                className="w-[120px] h-10"
                alt="Mobile app store"
                src="/mobile-app-store-badges.svg"
              />
              <div className="w-[135px] h-10 bg-black rounded-[5px] overflow-hidden border border-solid border-white flex items-center justify-center relative">
                <img
                  className="absolute w-[85px] h-[17px] top-[17px] left-[41px]"
                  alt="Google play"
                  src="/google-play.svg"
                />
                <img
                  className="absolute w-[39px] h-1.5 top-[7px] left-[41px]"
                  alt="Get it on"
                  src="/get-it-on.svg"
                />
                <div className="absolute w-[23px] h-[26px] top-[7px] left-2.5 bg-[url(/subtract.svg)] bg-[100%_100%]" />
              </div>
            </div>
          </div>

          {/* Right Column - App Screenshots */}
          <div className="flex-1 relative h-[501px]">
            <img
              className="absolute w-[205px] h-[443px] top-[58px] left-0 object-cover"
              alt="Player mobile"
              src="/player-mobile-1.png"
            />
            <img
              className="absolute w-[231px] h-[501px] top-0 left-[148px] object-cover"
              alt="Pass app"
              src="/pass-app-1.png"
            />
            <img
              className="absolute w-[204px] h-[442px] top-[59px] left-[348px] object-cover"
              alt="Start app"
              src="/start-app-1.png"
            />
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