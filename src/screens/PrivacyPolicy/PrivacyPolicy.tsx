import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";

export const PrivacyPolicy = (): JSX.Element => {
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
            <h1 className="font-['Sora',Helvetica] font-semibold text-3xl sm:text-[50px] tracking-[3px] sm:tracking-[5.00px] leading-tight sm:leading-[50px] text-[#1e2321] mb-8 sm:mb-12">
              Privacy Policy
            </h1>

            <div className="prose prose-lg max-w-none">
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-base sm:text-lg mb-4 sm:mb-6">
                This privacy policy applies to the Amir Performance app (hereby referred to as "Application") for mobile devices that was created by Amir Performance (hereby referred to as "Service Provider") as a Free service. This service is intended for use "AS IS".
              </p>

              <h2 className="font-['Sora',Helvetica] font-semibold text-2xl sm:text-[32px] text-[#1e2321] mt-8 sm:mt-12 mb-4 sm:mb-6">
                Information Collection and Use
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-base sm:text-lg mb-4 sm:mb-6">
                The Application collects information when you download and use it. This information may include information such as - your device's Internet Protocol address (e.g. IP address), your device's Internet Protocol address (e.g. IP address), the pages of the application that you visit, the time and date of your visit, the time spent on those pages, the time spent on the Application, the operating system you use on your mobile device. The Application does not gather precise information about the location of your mobile device.
              </p>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-base sm:text-lg mb-4 sm:mb-6">
                The Service Provider may use the information you provided to contact you from time to time to provide you with important information, required notices and marketing promotions. For a better experience, while using the Application, the Service Provider may require you to provide us with certain personally identifiable information, including but not limited to Email, Full name, user id. The information that the Service Provider request will be retained by them and used as described in this privacy policy.
              </p>

              <h2 className="font-['Sora',Helvetica] font-semibold text-2xl sm:text-[32px] text-[#1e2321] mt-8 sm:mt-12 mb-4 sm:mb-6">
                Third Party Access
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-base sm:text-lg mb-4 sm:mb-6">
                Only aggregated, anonymized data is periodically transmitted to external services to aid the Service Provider in improving the Application and their service. The Service Provider may share your information with third parties in the ways that are described in this privacy statement. Please note that the Application utilizes third-party services that have their own Privacy Policy about handling data. Below are the links to the Privacy Policy of the third-party service providers used by the Application: Google Play Services Google Analytics for Firebase Firebase Crashlytics The Service Provider may disclose User Provided and Automatically Collected Information: as required by law, such as to comply with a subpoena, or similar legal process; when they believe in good faith that disclosure is necessary to protect their rights, protect your safety or the safety of others, investigate fraud, or respond to a government request; with their trusted services providers who work on their behalf, do not have an independent use of the information we disclose to them, and have agreed to adhere to the rules set forth in this privacy statement.
              </p>

              <h2 className="font-['Sora',Helvetica] font-semibold text-2xl sm:text-[32px] text-[#1e2321] mt-8 sm:mt-12 mb-4 sm:mb-6">
                Opt-Out Rights
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-base sm:text-lg mb-4 sm:mb-6">
                You can stop all collection of information by the Application easily by uninstalling it. You may use the standard uninstall processes as may be available as part of your mobile device or via the mobile application marketplace or network.
              </p>

              <h2 className="font-['Sora',Helvetica] font-semibold text-2xl sm:text-[32px] text-[#1e2321] mt-8 sm:mt-12 mb-4 sm:mb-6">
                Data Retention Policy
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-base sm:text-lg mb-4 sm:mb-6">
                The Service Provider will retain User Provided data for as long as you use the Application and for a reasonable time thereafter. If you'd like them to delete User Provided Data that you have provided via the Application, please contact them at info@amirperformance.com and they will respond in a reasonable time.
              </p>

              <h2 className="font-['Sora',Helvetica] font-semibold text-2xl sm:text-[32px] text-[#1e2321] mt-8 sm:mt-12 mb-4 sm:mb-6">
                Children
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-base sm:text-lg mb-4 sm:mb-6">
                The Service Provider does not use the Application to knowingly solicit data from or market to children under the age of 13. The Application does not address anyone under the age of 13. The Service Provider does not knowingly collect personally identifiable information from children under 13 years of age. In the case the Service Provider discover that a child under 13 has provided personal information, the Service Provider will immediately delete this from their servers. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact the Service Provider (info@amirperformance.com) so that they will be able to take the necessary actions.
              </p>

              <h2 className="font-['Sora',Helvetica] font-semibold text-2xl sm:text-[32px] text-[#1e2321] mt-8 sm:mt-12 mb-4 sm:mb-6">
                Security
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-base sm:text-lg mb-4 sm:mb-6">
                The Service Provider is concerned about safeguarding the confidentiality of your information. The Service Provider provides physical, electronic, and procedural safeguards to protect information the Service Provider processes and maintains.
              </p>

              <h2 className="font-['Sora',Helvetica] font-semibold text-2xl sm:text-[32px] text-[#1e2321] mt-8 sm:mt-12 mb-4 sm:mb-6">
                Changes
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-base sm:text-lg mb-4 sm:mb-6">
                This Privacy Policy may be updated from time to time for any reason. The Service Provider will notify you of any changes to the Privacy Policy by updating this page with the new Privacy Policy. You are advised to consult this Privacy Policy regularly for any changes, as continued use is deemed approval of all changes. This privacy policy is effective as of 2025-03-05
              </p>

              <h2 className="font-['Sora',Helvetica] font-semibold text-2xl sm:text-[32px] text-[#1e2321] mt-8 sm:mt-12 mb-4 sm:mb-6">
                Your Consent
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-base sm:text-lg mb-4 sm:mb-6">
                By using the Application, you are consenting to the processing of your information as set forth in this Privacy Policy now and as amended by us.
              </p>

              <h2 className="font-['Sora',Helvetica] font-semibold text-2xl sm:text-[32px] text-[#1e2321] mt-8 sm:mt-12 mb-4 sm:mb-6">
                Contact Us
              </h2>
              <p className="font-['Sora',Helvetica] text-[#1e2321] text-base sm:text-lg mb-4 sm:mb-6">
                If you have any questions regarding privacy while using the Application, or have questions about the practices, please contact the Service Provider via email at info@amirperformance.com.
              </p>
            </div>
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