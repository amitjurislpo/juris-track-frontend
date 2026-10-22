/** Hindi for the fixed messages the API sends back (errors and success notices). The English text is the key. */
export const trackHindiApiMessages: Record<string, string> = {
  "Something went wrong. Please try again.": "कुछ गड़बड़ हो गई। कृपया दोबारा कोशिश करें।",
  // sign-in and session (backend AuthService, exceptions, OriginCheckFilter)
  "If that account exists and is active, a 6-digit code is on its way to the email.": "अगर यह खाता मौजूद और सक्रिय है, तो 6 अंकों का कोड ईमेल पर भेजा जा रहा है।",
  "That code is wrong or has expired. Request a new one.": "यह कोड ग़लत है या इसकी अवधि समाप्त हो गई है। नया कोड मँगाएँ।",
  "Too many code requests. Please wait a few minutes and try again.": "बहुत अधिक कोड अनुरोध। कृपया कुछ मिनट रुककर दोबारा कोशिश करें।",
  "Too many failed sign-in attempts. Please wait a few minutes and try again.": "बहुत अधिक असफल साइन-इन प्रयास। कृपया कुछ मिनट रुककर दोबारा कोशिश करें।",
  "Enter your email.": "अपना ईमेल डालें।",
  "Enter a valid email.": "मान्य ईमेल डालें।",
  "Enter the 6-digit code.": "6 अंकों का कोड डालें।",
  "Your session has ended. Please sign in again.": "आपका सत्र समाप्त हो गया है। कृपया फिर से साइन इन करें।",
  "You don't have permission to do that.": "आपको यह करने की अनुमति नहीं है।",
  "Cross-site request blocked.": "क्रॉस-साइट अनुरोध रोका गया।",
};
