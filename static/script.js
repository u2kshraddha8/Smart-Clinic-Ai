let selectedLanguage = "english";
let patientName = "";
let patientAge = "";

const languageButtons = document.querySelectorAll(".language-btn");
const voiceButton = document.getElementById("voiceBtn");
const instructionText = document.getElementById("instructionText");

function setSelectedLanguage(language) {
    selectedLanguage = language;

    languageButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.language === language);
    });

    const welcomeMessages = {
        english: "Welcome to SmartClinic AI. Please tell me your name.",
        hindi: "स्मार्ट क्लिनिक एआई में आपका स्वागत है। कृपया अपना नाम बताइए।",
        marathi: "स्मार्ट क्लिनिक एआय मध्ये आपले स्वागत आहे. कृपया आपले नाव सांगा."
    };

    const voiceLanguage = {
        english: "en-IN",
        hindi: "hi-IN",
        marathi: "mr-IN"
    };

    speak(welcomeMessages[language], voiceLanguage[language]);
}

languageButtons.forEach((button) => {
    button.addEventListener("click", function () {
        setSelectedLanguage(this.dataset.language);
    });
});

function speak(text, language) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = language;
    speech.rate = 0.9;
    speech.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
}

function getSpeechLanguage() {
    const languageMap = {
        english: "en-IN",
        hindi: "hi-IN",
        marathi: "mr-IN"
    };

    return languageMap[selectedLanguage] || "en-IN";
}

function startVoiceRecognition({ promptMessage, onSuccess, onError }) {
    if (!("webkitSpeechRecognition" in window)) {
        alert("Voice recognition is not supported. Please use Google Chrome.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = getSpeechLanguage();

    recognition.onstart = function () {
        voiceButton.textContent = "🎙️ Listening...";
    };

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript.trim();
        voiceButton.textContent = "🎙️ Speak";
        onSuccess(transcript);
    };

    recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
        voiceButton.textContent = "🎙️ Speak";
        onError(event);
    };

    recognition.onend = function () {
        voiceButton.textContent = "🎙️ Speak";
    };

    recognition.start();
}

function askForName() {
    startVoiceRecognition({
        promptMessage: "Please tell me your name.",
        onSuccess: function (transcript) {
            patientName = transcript;
            instructionText.textContent = "Name: " + patientName;

            const ageMessages = {
                english: "Thank you. What is your age?",
                hindi: "धन्यवाद। आपकी उम्र कितनी है?",
                marathi: "धन्यवाद. तुमचे वय किती आहे?"
            };

            speak(ageMessages[selectedLanguage], getSpeechLanguage());
            setTimeout(startAgeListening, 2500);
        },
        onError: function () {
            alert("Could not understand your name. Please try again.");
        }
    });
}

function startNameListening() {
    askForName();
}

function startAgeListening() {
    startVoiceRecognition({
        onSuccess: function (transcript) {
            patientAge = transcript;
            instructionText.textContent = "Name: " + patientName + " | Age: " + patientAge;
            submitRegistration();
        },
        onError: function () {
            alert("Could not understand the age. Please try again.");
        }
    });
}

function submitRegistration() {
    const payload = {
        name: patientName,
        age: patientAge,
        language: selectedLanguage
    };

    fetch("/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
        .then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok) {
                    throw new Error(data.message || "Unable to register patient.");
                }
                return data;
            });
        })
        .then(function (data) {
            const confirmationMessage = {
                english: "Registration complete. Your token is " + data.token + ". Please proceed to the dashboard.",
                hindi: "पंजीकरण पूरा हुआ। आपका टोकन " + data.token + " है। कृपया डैशबोर्ड पर जाएँ।",
                marathi: "नोंदणी पूर्ण झाली. तुमचा टोकन " + data.token + " आहे. कृपया डॅशबोर्डवर जा."
            };

            instructionText.textContent = "Registration complete. Token: " + data.token;
            speak(confirmationMessage[selectedLanguage], getSpeechLanguage());
            voiceButton.textContent = "✅ Registered";

            setTimeout(function () {
                window.location.href = "/dashboard";
            }, 2500);
        })
        .catch(function (error) {
            console.error("Registration error:", error);
            alert(error.message || "Unable to register patient.");
            voiceButton.textContent = "🎙️ Speak";
        });
}

voiceButton.addEventListener("click", function () {
    startNameListening();
});

setSelectedLanguage(selectedLanguage);