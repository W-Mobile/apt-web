import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";

export const BasketballClubs = (): JSX.Element => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://l7t4tsuc0j.execute-api.eu-north-1.amazonaws.com/rest/redeemCode?email=${encodeURIComponent(
          email
        )}&code=${encodeURIComponent(code)}`
      );

      if (response.ok) {
        setIsSuccess(true);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "An error occurred. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-[#e9e8dc] flex flex-row justify-center w-full min-h-screen">
        <div className="bg-[#e9e8dc] w-full max-w-[1512px] relative py-6">
          <header className="flex justify-between items-center px-4 sm:px-6 mb-8 sm:mb-16">
            <Link to="/">
              <img
                className="w-[50px] sm:w-[67px] h-[43px] sm:h-[58px] object-cover"
                alt="Endastlogga"
                src="/endastlogga-1.png"
              />
            </Link>
            <div className="font-['Sora',Helvetica] font-normal text-[#1e2321] text-2xl sm:text-3xl">
              Basketball clubs
            </div>
          </header>

          <main className="px-4 sm:px-6">
            <div className="max-w-[1440px] mx-auto">
              <h1 className="font-['Sora',Helvetica] font-semibold text-4xl sm:text-[80px] leading-tight sm:leading-[1.1] text-[#1e2321] mb-6">
                All done, restart the app and you're good to go!
              </h1>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#e9e8dc] flex flex-row justify-center w-full min-h-screen">
      <div className="bg-[#e9e8dc] w-full max-w-[1512px] relative py-6">
        {/* Header */}
        <header className="flex justify-between items-center px-4 sm:px-6 mb-8 sm:mb-16">
          <Link to="/">
            <img
              className="w-[50px] sm:w-[67px] h-[43px] sm:h-[58px] object-cover"
              alt="Endastlogga"
              src="/endastlogga-1.png"
            />
          </Link>
        </header>

        {/* Main Content */}
        <main className="px-4 sm:px-6">
          <div className="max-w-[1440px] mx-auto">
            <h1 className="font-['Sora',Helvetica] font-semibold text-4xl sm:text-[80px] leading-tight sm:leading-[1.1] text-[#1e2321] mb-4 sm:mb-6">
              Get started
            </h1>
            <p className="font-['Sora',Helvetica] text-xl sm:text-[32px] leading-tight sm:leading-[1.2] text-[#1e2321] mb-8 sm:mb-16 max-w-[1000px]">
              If you're part of a basketball club partnered with Amir Performance,
              please enter your details below to get started
            </p>

            <form onSubmit={handleSubmit} className="max-w-[800px] space-y-6 sm:space-y-8">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                  {error}
                </div>
              )}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-6 sm:px-8 py-4 sm:py-6 text-xl sm:text-[32px] bg-[#f2f2ec] rounded-[20px] border-none placeholder:text-[#1e2321] text-[#1e2321] font-['Sora',Helvetica]"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Code"
                  className="w-full px-6 sm:px-8 py-4 sm:py-6 text-xl sm:text-[32px] bg-[#f2f2ec] rounded-[20px] border-none placeholder:text-[#1e2321] text-[#1e2321] font-['Sora',Helvetica]"
                  required
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-[#F24E1E] text-white font-['Sora',Helvetica] text-xl sm:text-[32px] py-4 sm:py-6 rounded-[20px] hover:bg-[#d93d0f] transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {isLoading ? "Submitting..." : "Submit"}
              </button>
            </form>
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
              Kungsgatan 50
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
                <a
                  href="#"
                  className="font-['Sora',Helvetica] font-medium text-[#1e2321] text-base sm:text-lg underline block"
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