const API = "/api/v1";

let selectedMovie = null;
let selectedShow = null;
let selectedSeats = [];


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

async function apiRequest(url, options = {}) {

    console.log("API:", url);

    const response = await fetch(url, options);

    const data = await response.json();

    console.log("Response:", data);

    if (!response.ok) {

        throw new Error(
            data?.error?.message ||
            "Request failed"
        );
    }

    return data;
}


/*
|--------------------------------------------------------------------------
| Load Movies
|--------------------------------------------------------------------------
*/

async function loadMovies() {

    const container =
        document.getElementById("movies");

    try {

        const result =
            await apiRequest(
                `${API}/movies`
            );

        const movies =
            result.data || result;

        container.innerHTML = "";

        if (!movies.length) {

            container.innerHTML =
                "<p>No movies found.</p>";

            return;
        }

        movies.forEach(movie => {

            const element =
                document.createElement("div");

            element.className = "movie";

            element.innerHTML = `
                <strong>${movie.title}</strong>
                <br>
                ${movie.language || ""}
                <br>
                ${movie.durationMin} minutes
            `;

            element.onclick = () =>
                selectMovie(movie);

            container.appendChild(element);
        });

    } catch (error) {

        container.innerHTML =
            `<p>Error: ${error.message}</p>`;

        console.error(error);
    }
}


/*
|--------------------------------------------------------------------------
| Select Movie
|--------------------------------------------------------------------------
*/

async function selectMovie(movie) {

    selectedMovie = movie;

    selectedShow = null;

    selectedSeats = [];

    document.getElementById("selectedSeats")
        .textContent = "0";

    document.getElementById("shows")
        .innerHTML = "Loading shows...";

    document.getElementById("seats")
        .innerHTML = "Select a show first.";

    updatePayButton();

    await loadShows(movie.id);
}


/*
|--------------------------------------------------------------------------
| Load Shows
|--------------------------------------------------------------------------
*/

async function loadShows(movieId) {

    const container =
        document.getElementById("shows");

    container.innerHTML =
        "Loading shows...";

    try {

        const result =
            await apiRequest(
                `${API}/movies/${movieId}/shows`
            );

        const shows =
            result.data || result;

        container.innerHTML = "";

        if (!shows.length) {

            container.innerHTML =
                "<p>No shows available.</p>";

            return;
        }

        shows.forEach(show => {

            const element =
                document.createElement("div");

            element.className = "show";

            const start =
                new Date(show.startTime);

            const end =
                new Date(show.endTime);

            element.innerHTML = `
                <strong>
                    ${start.toLocaleDateString()}
                </strong>
                <br>
                ${start.toLocaleTimeString()}
                -
                ${end.toLocaleTimeString()}
                <br>
                Status: ${show.status}
            `;

            element.onclick = () =>
                selectShow(show);

            container.appendChild(element);
        });

    } catch (error) {

        container.innerHTML =
            `<p>Error: ${error.message}</p>`;

        console.error(error);
    }
}


/*
|--------------------------------------------------------------------------
| Select Show
|--------------------------------------------------------------------------
*/

async function selectShow(show) {

    selectedShow = show;

    selectedSeats = [];

    document.getElementById("selectedSeats")
        .textContent = "0";

    updatePayButton();

    await loadSeats(show.id);
}


/*
|--------------------------------------------------------------------------
| Load Seats
|--------------------------------------------------------------------------
*/

// async function loadSeats(showId) {

//     const container =
//         document.getElementById("seats");

//     container.innerHTML =
//         "Loading seats...";

//     try {

//         const result =
//             await apiRequest(
//                 `${API}/shows/${showId}/seats`
//             );

//         const seats =
//             result.data || result;

//         container.innerHTML = "";

//         if (!seats.length) {

//             container.innerHTML =
//                 "<p>No seats found.</p>";

//             return;
//         }

//         seats.forEach(showSeat => {

//             const element =
//                 document.createElement("div");

//             element.className = "seat";

//             element.textContent =
//                 `${showSeat.seatRow}${showSeat.seatNumber}`;


//             /*
//              * Only AVAILABLE seats
//              * can be selected.
//              */

//             if (
//                 showSeat.status !==
//                 "AVAILABLE"
//             ) {

//                 element.classList.add("booked");

//                 element.title =
//                     showSeat.status;

//                 return;
//             }


//             element.classList.add("available");

//             element.onclick = () =>
//                 toggleSeat(
//                     showSeat,
//                     element
//                 );

//             container.appendChild(element);
//         });

//     } catch (error) {

//         container.innerHTML =
//             `<p>Error: ${error.message}</p>`;

//         console.error(error);
//     }
// }

async function loadSeats(showId) {

    const container =
        document.getElementById("seats");

    container.innerHTML =
        "Loading seats...";

    try {

        const result =
            await apiRequest(
                `${API}/shows/${showId}/seats`
            );

        const seats =
            result.data || result;

        container.innerHTML = "";

        if (!Array.isArray(seats) || seats.length === 0) {

            container.innerHTML =
                "<p>No seats found.</p>";

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | Seat Legend
        |--------------------------------------------------------------------------
        */

        const legend =
            document.createElement("div");

        legend.className =
            "seat-legend";

        legend.innerHTML = `
            <div class="legend-item">
                <span class="legend-seat available"></span>
                <span>Available</span>
            </div>

            <div class="legend-item">
                <span class="legend-seat selected"></span>
                <span>Selected</span>
            </div>

            <div class="legend-item">
                <span class="legend-seat reserved"></span>
                <span>Reserved</span>
            </div>

            <div class="legend-item">
                <span class="legend-seat booked"></span>
                <span>Booked</span>
            </div>

            <div class="legend-item">
                <span class="legend-seat unavailable"></span>
                <span>Unavailable</span>
            </div>
        `;

        container.appendChild(
            legend
        );


        /*
        |--------------------------------------------------------------------------
        | Seat Grid
        |--------------------------------------------------------------------------
        */

        const grid =
            document.createElement("div");

        grid.className =
            "seat-grid";


        seats.forEach(showSeat => {

            const element =
                document.createElement("button");

            element.type =
                "button";

            element.className =
                "seat";


            /*
            |--------------------------------------------------------------------------
            | Get Seat Information
            |--------------------------------------------------------------------------
            */

            const seat =
                showSeat.seat || {};

            const seatRow =
                showSeat.seatRow ??
                seat.seatRow ??
                "?";

            const seatNumber =
                showSeat.seatNumber ??
                seat.seatNumber ??
                "?";

            const seatLabel =
                `${seatRow}${seatNumber}`;

            const status =
                String(
                    showSeat.status ??
                    "UNKNOWN"
                ).toUpperCase();


            /*
            |--------------------------------------------------------------------------
            | Display Seat Number
            |--------------------------------------------------------------------------
            */

            element.textContent =
                seatLabel;


            /*
            |--------------------------------------------------------------------------
            | Accessibility
            |--------------------------------------------------------------------------
            */

            element.setAttribute(
                "aria-label",
                `Seat ${seatLabel} - ${status}`
            );


            /*
            |--------------------------------------------------------------------------
            | Status
            |--------------------------------------------------------------------------
            */

            element.dataset.status =
                status;


            /*
            |--------------------------------------------------------------------------
            | AVAILABLE
            |--------------------------------------------------------------------------
            */

            if (
                status ===
                "AVAILABLE"
            ) {

                element.classList.add(
                    "available"
                );

                element.title =
                    `Seat ${seatLabel} - Available`;

                element.onclick = () =>
                    toggleSeat(
                        showSeat,
                        element
                    );

            }


            /*
            |--------------------------------------------------------------------------
            | RESERVED
            |--------------------------------------------------------------------------
            */

            else if (
                status ===
                "RESERVED"
            ) {

                element.classList.add(
                    "reserved"
                );

                element.disabled =
                    true;

                element.title =
                    `Seat ${seatLabel} - Reserved`;

            }


            /*
            |--------------------------------------------------------------------------
            | BOOKED
            |--------------------------------------------------------------------------
            */

            else if (
                status ===
                "BOOKED"
            ) {

                element.classList.add(
                    "booked"
                );

                element.disabled =
                    true;

                element.title =
                    `Seat ${seatLabel} - Booked`;

            }


            /*
            |--------------------------------------------------------------------------
            | UNAVAILABLE
            |--------------------------------------------------------------------------
            */

            else if (
                status ===
                "UNAVAILABLE"
            ) {

                element.classList.add(
                    "unavailable"
                );

                element.disabled =
                    true;

                element.title =
                    `Seat ${seatLabel} - Unavailable`;

            }


            /*
            |--------------------------------------------------------------------------
            | Unknown status
            |--------------------------------------------------------------------------
            */

            else {

                element.classList.add(
                    "unavailable"
                );

                element.disabled =
                    true;

                element.title =
                    `Seat ${seatLabel} - ${status}`;

            }


            grid.appendChild(
                element
            );
        });


        container.appendChild(
            grid
        );

    } catch (error) {

        container.innerHTML =
            `<p>Error: ${error.message}</p>`;

        console.error(
            "Seat loading error:",
            error
        );
    }
}

/*
|--------------------------------------------------------------------------
| Select / Unselect Seat
|--------------------------------------------------------------------------
*/

function toggleSeat(
    showSeat,
    element
) {

    const index =
        selectedSeats.findIndex(
            seat =>
                seat.id === showSeat.id
        );


    /*
     * Select seat
     */

    if (index === -1) {

        selectedSeats.push(
            showSeat
        );

        element.classList.add(
            "selected"
        );

    }


    /*
     * Unselect seat
     */

    else {

        selectedSeats.splice(
            index,
            1
        );

        element.classList.remove(
            "selected"
        );
    }


    document.getElementById(
        "selectedSeats"
    ).textContent =
        selectedSeats.length;


    updatePayButton();
}


/*
|--------------------------------------------------------------------------
| Update Pay Button
|--------------------------------------------------------------------------
*/

function updatePayButton() {

    const button =
        document.getElementById(
            "payButton"
        );

    const name =
        document.getElementById(
            "guestName"
        )
        .value
        .trim();

    const phone =
        document.getElementById(
            "guestPhone"
        )
        .value
        .trim();


    button.disabled =
        !selectedShow ||
        selectedSeats.length === 0 ||
        !name ||
        !phone;
}


/*
|--------------------------------------------------------------------------
| Guest Input Listeners
|--------------------------------------------------------------------------
*/

document
    .getElementById("guestName")
    .addEventListener(
        "input",
        updatePayButton
    );


document
    .getElementById("guestPhone")
    .addEventListener(
        "input",
        updatePayButton
    );


/*
|--------------------------------------------------------------------------
| Payment Button
|--------------------------------------------------------------------------
*/

document
    .getElementById("payButton")
    .addEventListener(
        "click",
        startBooking
    );


/*
|--------------------------------------------------------------------------
| Start Booking
|--------------------------------------------------------------------------
*/

async function startBooking() {

    const button =
        document.getElementById(
            "payButton"
        );

    const message =
        document.getElementById(
            "message"
        );


    button.disabled = true;


    try {

        /*
        |--------------------------------------------------------------------------
        | STEP 1
        | Create Reservation
        |--------------------------------------------------------------------------
        */

        message.textContent =
            "Creating reservation...";


        const reservationResult =
            await apiRequest(
                `${API}/reservations`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        showId:
                            selectedShow.id,

                        guest: {

                            name:
                                document
                                    .getElementById(
                                        "guestName"
                                    )
                                    .value
                                    .trim(),

                            phone:
                                document
                                    .getElementById(
                                        "guestPhone"
                                    )
                                    .value
                                    .trim()
                        },

                        seatIds:
                            selectedSeats.map(
                                seat =>
                                    seat.seatId ||
                                    seat.seat?.id ||
                                    seat.id
                            )
                    })
                }
            );


        const reservation =
            reservationResult.data ||
            reservationResult;


        console.log(
            "Reservation created:",
            reservation
        );


        /*
        |--------------------------------------------------------------------------
        | STEP 2
        | Create eSewa Payment
        |--------------------------------------------------------------------------
        */

        message.textContent =
            "Creating eSewa payment...";


        const paymentResult =
            await apiRequest(

                `${API}/reservations/${reservation.id}/payments`,

                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        method: "WALLET",

                        provider: "ESEWA"

                    })
                }
            );


        const paymentData =
            paymentResult.data ||
            paymentResult;


        console.log(
            "Payment response:",
            paymentData
        );


        /*
        |--------------------------------------------------------------------------
        | STEP 3
        | Get eSewa Provider Data
        |--------------------------------------------------------------------------
        */

        const provider =
            paymentData.provider;


        if (!provider) {

            throw new Error(
                "eSewa provider information missing"
            );
        }


        if (!provider.redirectUrl) {

            throw new Error(
                "eSewa redirect URL missing"
            );
        }


        if (!provider.form) {

            throw new Error(
                "eSewa payment form missing"
            );
        }


        console.log(
            "eSewa provider:",
            provider
        );


        /*
        |--------------------------------------------------------------------------
        | STEP 4
        | Submit eSewa Form
        |--------------------------------------------------------------------------
        */

        message.textContent =
            "Redirecting to eSewa...";


        redirectToEsewa(
            provider
        );

    }


    catch (error) {

        console.error(
            "Booking error:",
            error
        );


        message.textContent =
            `Error: ${error.message}`;


        button.disabled = false;
    }
}


/*
|--------------------------------------------------------------------------
| Redirect / Submit eSewa Payment Form
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| eSewa expects a POST request containing
| the payment form fields.
|
| We must NOT do:
|
| window.location.href = provider.redirectUrl
|
| Instead we create an HTML form and submit it.
|
|--------------------------------------------------------------------------
*/

function redirectToEsewa(
    provider
) {

    console.log(
        "Submitting eSewa payment..."
    );


    /*
     * Create form
     */

    const form =
        document.createElement(
            "form"
        );


    /*
     * eSewa expects POST
     */

    form.method =
        "POST";


    /*
     * eSewa payment endpoint
     */

    form.action =
        provider.redirectUrl;


    /*
     * Hide form
     */

    form.style.display =
        "none";


    /*
     * Add all eSewa fields
     */

    Object.entries(
        provider.form
    ).forEach(
        ([key, value]) => {

            const input =
                document.createElement(
                    "input"
                );


            input.type =
                "hidden";


            input.name =
                key;


            input.value =
                value;


            form.appendChild(
                input
            );
        }
    );


    /*
     * Add form to document
     */

    document.body.appendChild(
        form
    );


    console.log(
        "eSewa form:",
        provider.form
    );


    /*
     * Submit to eSewa
     */

    form.submit();
}


/*
|--------------------------------------------------------------------------
| Start Application
|--------------------------------------------------------------------------
*/

loadMovies();