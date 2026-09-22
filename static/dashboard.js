async function loadQueue() {

    try {

        const response = await fetch("/queue");

        const patients = await response.json();

        const queueList = document.getElementById("queueList");

        queueList.innerHTML = "";

        // Find currently serving patient
        const servingPatient = patients.find(
            patient => patient.status === "serving"
        );

        if (servingPatient) {

            document.getElementById("currentToken").textContent =
                servingPatient.token;

            document.getElementById("currentPatient").textContent =
                servingPatient.name;

        } else {

            document.getElementById("currentToken").textContent = "—";

            document.getElementById("currentPatient").textContent =
                "No patient currently being served";
        }


        // Show waiting patients
        const waitingPatients = patients.filter(
            patient => patient.status === "waiting"
        );


        if (waitingPatients.length === 0) {

            queueList.innerHTML =
                "<p>No patients waiting.</p>";

            return;
        }


        waitingPatients.forEach(patient => {

            const patientDiv = document.createElement("div");

            patientDiv.className = "patient-row";

            patientDiv.innerHTML = `
                <div class="token">
                    ${patient.token}
                </div>

                <div class="patient-info">
                    <strong>${patient.name}</strong>
                    <span>Age: ${patient.age}</span>
                </div>
            `;

            queueList.appendChild(patientDiv);

        });

    } catch (error) {

        console.error(error);

    }
}


// CALL NEXT button

document.getElementById("callNextBtn").addEventListener(
    "click",
    async function () {

        try {

            const response = await fetch("/call-next", {
                method: "POST"
            });

            const data = await response.json();

            if (data.success) {

                loadQueue();

                // Voice announcement
                const message =
                    "Token " +
                    data.token +
                    ". " +
                    data.name +
                    ", please go to the doctor.";

                const speech =
                    new SpeechSynthesisUtterance(message);

                speechSynthesis.speak(speech);

            } else {

                alert(data.message);

            }

        } catch (error) {

            console.error(error);

            alert("Unable to connect to the clinic server.");

        }

    }
);


// Initial load
loadQueue();


// Refresh every 3 seconds
setInterval(loadQueue, 3000);