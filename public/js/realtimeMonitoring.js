const myArray = [];
localStorage.setItem('notifications', JSON.stringify(myArray));     //instantiate the notification var at the local storage
const history = [];
const constVar = {
    cohesion: localStorage.getItem('cohesion'),
    normalStress: localStorage.getItem('normalStress'),
    frictionAngle: localStorage.getItem('frictionAngle'),
    weightSoilNS: localStorage.getItem('weightSoilNS'),
    heightSlope: localStorage.getItem('heightSlope'),
    slopeAngle: localStorage.getItem('slopeAngle')
}
console.log(constVar)

// start for convertin radian into numerical
function getTanValue(angle){
    function degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    // Calculate the tangent of an angle in degrees
    function tanAngle(degrees) {
        var radians = degreesToRadians(degrees);
        return Math.tan(radians).toFixed(3);
    }
    // return the numeric value
    // console.log('tan value',tanAngle(angle))
    return tanAngle(angle) * 1;
}
function getCosValue(angle){
    function degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    // Calculate the tangent of an angle in degrees
    function cosAngle(degrees) {
        var radians = degreesToRadians(degrees);
        return Math.cos(radians).toFixed(3);
    }
    // return the numeric value
    // console.log('cos value',cosAngle(angle))
    return cosAngle(angle) * 1;
}
function getSinValue(angle){
    function degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    // Calculate the tangent of an angle in degrees
    function sinAngle(degrees) {
        var radians = degreesToRadians(degrees);
        return Math.sin(radians).toFixed(3);
    }
    // return the numeric value
    // console.log('sin value',sinAngle(angle))
    return sinAngle(angle) * 1;
}


//initial data for starting the chart
var initialData = {
    labels: ['start'],
    datasets: [{
        label: 'Monitoring System',
        data: [0.5],
        borderWidth: .5,
        borderColor: 'blue',
        backgroundColor: 'blue'
    }]
};

// Create the initial chart
var ctx = document.getElementById('myChart').getContext('2d');
var myChart = new Chart(ctx, {
    type: 'line',
    data: initialData,
    options: {
        animations: {
        // tension: {
        //     // duration: 2000,
        //     // easing: 'linear',
        //     from: 1,
        //     to: 0,
        //     loop: true
        //     }
        },
        scales: {
            y: {
                beginAtZero: true
            },
            x: {
                min: 0,
                max: 20
            }
        },
    }
});

//counter to record the counts
let criteria = {
    lowRisk : 0,
    moderateRisk : 0,
    highRisk : 0,
    veryHighRisk : 0,
    critical : 0  
}

const token = 'd-WSE9yeR9Gbt-mzf4-2BT_he9aglQ16';   // change this to use another token of blynk
const config_time_interval = 1000;                  // change this to change time interval
// Function to add new data and update the chart
async function addData() {
    response = {};
    for(let i=0; i<5; i++){
        try{
            const res = await axios.get(`https://sgp1.blynk.cloud/external/api/get?1&token=${token}&v${i}`)
            // console.log(`v${i} result here: `,res.data);
            const key = Object.keys(res.data);      // get the key of the response the v0,v1...
            response[`v${i}`] = res.data[key]
        }catch(error){
            console.error(error);
        }   
    }
    console.log(response);
    /* these are the variables
        V0= soil moisture 
        V1= water pressure 
        V2= angle x
        V3= angle y
        V4= angle z    

        θ = arccos(z / √(x^2 + y^2 + z^2))    #formula for getting the slope
    */
    const externalLoads = response.v0
    const waterPressure = response.v1
    // Calculate the magnitude of the vector
    const magnitude = Math.sqrt((response.v2 ** 2) + (response.v3 ** 2) + (response.v3 ** 2));
    // Calculate the angle in radians using the arccosine function
    const theta = Math.acos(response.v3 / magnitude);
    // Convert the angle from radians to degrees
    const inclinationAngle = theta * (180 / Math.PI);

    /* toggle this for testing visualization */
    // const externalLoads = (Math.random() * 100).toFixed(3)
    // const waterPressure = (Math.random() * 100).toFixed(3)
    // const inclinationAngle = (Math.random() * 100).toFixed(3)
    const data = {
        externalLoads,
        waterPressure,
        inclinationAngle
    }
    history.push(data)

    // compute the fos
    const numerator = constVar.cohesion + (constVar.normalStress * getTanValue(constVar.frictionAngle))
    const denominator = ( constVar.weightSoilNS * getSinValue(constVar.slopeAngle) ) + ( externalLoads * getCosValue(inclinationAngle) ) + ( waterPressure * getCosValue(inclinationAngle) * constVar.slopeAngle )
    const fos = (numerator/denominator).toFixed(3)
    
    //gett the current time
    var currentDate = new Date();
    var currentHour = currentDate.getHours();
    var currentMinute = currentDate.getMinutes().toString().padStart(2, '0');
    var currentSecond = currentDate.getSeconds().toString().padStart(2, '0');
    const time = currentHour + ':' + currentMinute + ':' + currentSecond

    // update the history UI realtime
    const historyList = document.getElementById('historyList')
    historyList.insertAdjacentHTML('afterbegin',
        `<li> 
            <p>TIME: ${time}</p>
            <p>External Loads: ${data.externalLoads}</p>
            <p>Water Pressure: ${data.waterPressure}</p>
            <p>Inclination Angle: ${data.inclinationAngle.toFixed(2)}</p>
            <p>FOS : ${fos}</p>
        </li>`
    );

    //check if the record exceeds 7 records remove the first index
    const length = myChart.data.datasets[0].data.length
    if(length>20){
        myChart.data.labels.splice(0,1)
        myChart.data.datasets[0].data.splice(0,1)
    }

    //push the labels and data
    myChart.data.labels.push(time);
    myChart.data.datasets[0].data.push(fos);

    let text = '';      //var holder for the management display text
    let label = '';   //var holder for the label of notification
    let code = '';    //var holder for the color coding of the category
    const section = document.getElementById('main')
    section.classList = []
    if( 0 <= fos && fos <= 0.5){
        displayWarning("stable")
        section.classList.add('low-risk')
        section.style.color = "white"
        label = 'low risk'
        code = 'green'
        criteria.lowRisk++
        text = 'Routine monitoring may be sufficient.'
    }else if(0.5 < fos && fos <= 0.95){
        displayWarning("potentially unstable")
        section.classList.add('moderate-risk')
        section.style.color = "black"
        label = 'moderate risk'
        code = 'yellow'
        criteria.moderateRisk++
        text = 'Implement monitoring and mitigation measures; periodic assessments.'
    }else if( 0.95 < fos && fos <= 1.05){
        displayWarning("significant potential for instability")
        section.classList.add('high-risk')
        section.style.color = "red"
        label = 'hight risk'
        code = 'orange'
        criteria.highRisk++
        text = 'Implement intensive monitoring, conduct detailed stability analysis, and consider engineering solutions or restrictions on land use.'
    }else if( 1.05 < fos && fos <= 1.5){
        displayWarning("imminent threat")
        section.classList.add('very-high-risk')
        section.style.color = "white"
        label = 'very high risk'
        code = 'red'
        criteria.veryHighRisk++
        text = 'Emergency measures, evacuation plans, and immediate engineering interventions.'
    }else{
        displayWarning("immediate danger")
        section.classList.add('critical-risk')
        label = 'immediate danger'
        code = 'purple'
        criteria.critical++
        text = 'Emergency response, evacuation, and immediate engineering interventions to stabilize or mitigate the slope.'
    }

    // Update the chart to reflect the new data
    myChart.update(); 


    const jsonString = localStorage.getItem('notifications');   //get the array and it is string
    const parsedArray = jsonString ? JSON.parse(jsonString) : [];   //converted the string into an array
    // remove the first index if the lenght of the array exceeds 5
    if(parsedArray.length > 15){
        parsedArray.splice(0,1)
    }

    // set the result in the local storage
    if(fos >= 0.8){     
        parsedArray.push({label,code});
        localStorage.setItem('notifications', JSON.stringify(parsedArray));
    }

    // set the criteria record to the local storage
    localStorage.setItem('criteria', JSON.stringify(criteria))

    const paragraph = document.getElementById('managementText')
    paragraph.textContent = `${label} (${code}) : ${text}`
    
}

// Example: Add new data every set seconds in config_time_interval in top of this function
setInterval((addData), config_time_interval);

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString();
    document.getElementById("timeDisplay").textContent = `Current Time: ${timeString}, Current Date: ${dateString}`;
}


function displayWarning(data){
    const warningContainer = document.getElementById('warningContainer');
    const warningMessage = document.getElementById('warningMessage');

    warningMessage.textContent = `Risk Level: ${data}`;
    warningMessage.style.textTransform = 'Capitalize'        
}

window.onload = function() {
    setInterval(updateTime, 1000);
};