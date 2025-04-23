import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";

export const Startsida = (): JSX.Element => {
  return (
    <div className="bg-[#e9e8dc] flex flex-row justify-center w-full min-h-screen">
      <div className="bg-[#e9e8dc] w-full max-w-[1512px] relative py-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 mb-8 sm:mb-16 gap-4">
          <img
            className="w-[50px] sm:w-[67px] h-[43px] sm:h-[58px] object-cover"
            alt="Endastlogga"
            src="/endastlogga-1.png"
          />
          <Link to="/basketball-clubs" className="font-['Sora',Helvetica] font-normal text-[#1e2321] text-2xl sm:text-3xl hover:underline">
            Basketball clubs
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex flex-col md:flex-row px-4 sm:px-6 gap-8">
          {/* Left Column - Text Content */}
          <div className="flex-1">
            <h1 className="font-['Sora',Helvetica] font-semibold text-3xl sm:text-[50px] tracking-[3px] sm:tracking-[5.00px] leading-tight sm:leading-[50px] text-[#1e2321] mb-4 sm:mb-6">
              AMIR PERFORMANCE
            </h1>
            <h2 className="font-['Sora',Helvetica] font-normal text-[#1e2321] text-2xl sm:text-[40px] tracking-[2px] sm:tracking-[4.00px] leading-tight sm:leading-10 mb-6 sm:mb-8 max-w-[586px]">
              Off-season &amp; in-season training that transfers to the court
            </h2>
            <p className="font-['Sora',Helvetica] font-normal text-[#1e2321] text-lg sm:text-[22px] tracking-[1px] sm:tracking-[2.20px] leading-tight sm:leading-[22px] mb-8 sm:mb-12 max-w-[645px]">
              Amir Performance is a training app specifically designed for
              basketball players of all levels.
            </p>

            {/* App Store Buttons */}
            <div className="flex gap-4 mb-8 sm:mb-12">
              <a href="https://apps.apple.com/us/app/amir-performance/id6469305611" target="_blank" rel="noopener noreferrer">
                <img
                  className="w-[100px] sm:w-[120px] h-8 sm:h-10"
                  alt="Download on the App Store"
                  src="/mobile-app-store-badges.svg"
                />
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.awayeinnovation.awayeapp" target="_blank" rel="noopener noreferrer" 
                className="w-[115px] sm:w-[135px] h-8 sm:h-10 bg-black rounded-[5px] overflow-hidden border border-solid border-white flex items-center justify-center relative">
                <img
                  className="absolute w-[75px] sm:w-[85px] h-[15px] sm:h-[17px] top-[14px] sm:top-[17px] left-[35px] sm:left-[41px]"
                  alt="Google play"
                  src="/google-play.svg"
                />
                <img
                  className="absolute w-[34px] sm:w-[39px] h-1.5 top-[6px] sm:top-[7px] left-[35px] sm:left-[41px]"
                  alt="Get it on"
                  src="/get-it-on.svg"
                />
                <div className="absolute w-[20px] sm:w-[23px] h-[22px] sm:h-[26px] top-[6px] sm:top-[7px] left-2 sm:left-2.5 bg-[url(/subtract.svg)] bg-[100%_100%]" />
              </a>
            </div>
          </div>

          {/* Right Column - App Screenshots */}
          <div className="flex-1 relative h-[300px] sm:h-[501px] mx-auto max-w-full overflow-hidden">
            <img
              className="absolute w-[123px] sm:w-[205px] h-[266px] sm:h-[443px] top-[35px] sm:top-[58px] left-0 object-cover"
              alt="Player mobile"
              src="/player-mobile-1.png"
            />
            <img
              className="absolute w-[139px] sm:w-[231px] h-[300px] sm:h-[501px] top-0 left-[89px] sm:left-[148px] object-cover"
              alt="Pass app"
              src="/pass-app-1.png"
            />
            <img
              className="absolute w-[122px] sm:w-[204px] h-[265px] sm:h-[442px] top-[35px] sm:top-[59px] left-[209px] sm:left-[348px] object-cover"
              alt="Start app"
              src="/start-app-1.png"
            />
          </div>
        </main>

        {/* Footer */}
        <Card className="mt-8 sm:mt-16 w-full rounded-none bg-[#f2f2ec] bg-opacity-50 border-none">
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-['Sora',Helvetica] font-semibold text-[#1e2321] text-xl sm:text-[22px] mb-3 sm:mb-4">
              Contact
            </h3>
            <p className="font-['Sora',Helvetica] font-medium text-[#1e2321] text-base sm:text-lg mb-3 sm:mb-4">
              Amir Performance Technology AB
            </p>
            <a
              className="font-['Sora',Helvetica] font-medium text-[#1e2321] text-base sm:text-lg underline block mb-3 sm:mb-4"
              href="mailto:info@amirperformance.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              info@amirperformance.com
            </a>
            <p className="font-['Sora',Helvetica] font-medium text-[#1e2321] text-base sm:text-lg mb-1">
              Kungsgatan 57
            </p>
            <p className="font-['Sora',Helvetica] font-medium text-[#1e2321] text-base sm:text-lg mb-3 sm:mb-4">
              41115, Göteborg
            </p>

            <div className="flex justify-end">
              <div className="space-y-2">
                <Link
                  to="/privacy-policy"
                  className="font-['Sora',Helvetica] font-medium text-[#1e2321] text-base sm:text-lg underline block"
                >
                  Privacy policy
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};