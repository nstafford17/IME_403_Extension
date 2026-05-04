console.log("Outlook Optimizer integrated layout loaded");

function buildIntegratedLayout() {
    if (document.getElementById("oo-integrated-app")) {
        return;
    }

    document.body.innerHTML = "";

    var app = document.createElement("div");
    app.id = "oo-integrated-app";

    app.innerHTML = `
        <div class="oo-app">
            <div class="oo-topbar">
                <strong>Outlook</strong>
                <input type="text" placeholder="Search mail">
            </div>

            <div class="oo-main">
                <div class="oo-sidebar">
                    <button class="active">Inbox</button>
                    <button>Classes</button>
                    <button>Jobs</button>
                    <button>Promos</button>
                </div>

                <div class="oo-inbox">
                    <h2>Priority Dashboard</h2>

                    <div class="oo-email-card urgent">
                        <strong>Cal Poly Admin</strong>
                        <p>Registration deadline today</p>
                    </div>

                    <div class="oo-email-card important">
                        <strong>Professor Chen</strong>
                        <p>Project rubric updated</p>
                    </div>

                    <div class="oo-email-card">
                        <strong>Career Services</strong>
                        <p>Engineering fair next week</p>
                    </div>

                    <div class="oo-email-card">
                        <strong>Amazon</strong>
                        <p>Your package has shipped</p>
                    </div>
                </div>

                <div class="oo-dashboard">
                    <h3>Email Assistant</h3>

                    <div class="oo-stats">
                        <div>
                            <strong>3</strong>
                            <span>Important</span>
                        </div>
                        <div class="red">
                            <strong>2</strong>
                            <span>Urgent</span>
                        </div>
                        <div>
                            <strong>5</strong>
                            <span>Tasks</span>
                        </div>
                    </div>

                    <h4>Upcoming Deadlines</h4>

                    <label><input type="checkbox"> Register for classes</label>
                    <label><input type="checkbox"> Review Project 2 rubric</label>
                    <label><input type="checkbox" checked> Email advisor</label>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(app);
}

buildIntegratedLayout();