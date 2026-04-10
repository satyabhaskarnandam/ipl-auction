const fs = require('fs');

const rawText = `
Marquee Players (7):
Ben Stokes — ₹2.00 Cr
Andre Russell — ₹2.00 Cr
David Warner — ₹2.00 Cr
Cameron Green — ₹2.00 Cr
Steve Smith — ₹2.00 Cr
Kane Williamson — ₹2.00 Cr
Liam Livingstone — ₹2.00 Cr

Batsmen(27):
Harry Brook — ₹2.00 Cr
Najmul Hossain Shanto — ₹75L
Mayank Agarwal — ₹1.50 Cr
Hazratullah Zazai — ₹50L
Ricky Bhui — ₹75L
Sarfaraz Khan — ₹75L
James Vince — ₹75L
Jake Fraser-McGurk — ₹2.00 Cr
Will Young — ₹1.00 Cr
David Miller — ₹2.00 Cr
Najibullah Zadran — ₹50L
Dawid Malan — ₹1.00 Cr
Rassie van der Dussen — ₹1.00 Cr
Reeza Hendricks — ₹50L
Priyank Panchal — ₹75L
Rahul Tripathi — ₹75L
Paul Stirling — ₹1.00 Cr
Pathum Nissanka — ₹1.00 Cr
Devon Conway — ₹2.00 Cr
Harry Tector — ₹1.00 Cr
Brandon King — ₹75L
Charith Asalanka — ₹1.00 Cr
Alex Hales — ₹1.00 Cr
Jason Roy — ₹1.00 Cr
Abhimanyu Easwaran — ₹75L
Temba Bavuma- 1.00 Cr
Ashton Turner- 75L

Fast Bowlers set(44):
Mark Wood — ₹2.00 Cr
Spencer Johnson — ₹1.00 Cr
Mohit Sharma — ₹75L
Akash Deep — ₹1.00 Cr
Alzarri Joseph — ₹1.50 Cr
Gus Atkinson — ₹1.50 Cr
Chetan Sakariya — ₹75L
Jacob Duffy — ₹1.50 Cr
Blessing Muzarabani — ₹50L
Josh Tongue — ₹1.00 Cr
Matt Henry — ₹1.00 Cr
Ishan Porel — ₹75L
Matheesha Pathirana — ₹2.00 Cr
Scott Boland — ₹50L
Reece Topley — ₹1.50 Cr
Riley Meredith — ₹75L
Luke Wood — ₹75L
Obed McCoy — ₹75L
Matthew Potts — ₹75L
Basil Thampi — ₹1.00 Cr
Chris Jordan — ₹1.50 Cr
Saqib Mahmood — ₹1.50 Cr
Jhye Richardson — ₹1.50 Cr
Naveen-ul-Haq — ₹1.00 Cr
Dilshan Madushanka — ₹1.50 Cr
Adam Milne — ₹75L
Josh Little — ₹1.00 Cr
Anrich Nortje — ₹2.00 Cr
Navdeep Saini — ₹75L
Tymal Mills — ₹50L
Ottniel Baartman — ₹75L
Richard Gleeson — ₹50L
Umesh Yadav — ₹1.00 Cr
Jason Behrendorff — ₹1.00 Cr
Kyle Jamieson — ₹1.50 Cr
Lungi Ngidi — ₹1.50 Cr
Gerald Coetzee — ₹2.00 Cr
Fazalhaq Farooqi — ₹1.00 Cr
Mustafizur Rahman — ₹1.50 Cr
Siddarth Kaul — ₹1.00 Cr
Ankit Rajpoot — ₹75L
Sean Abbott — ₹50L
Ben Dwarshuis — ₹50L
David Payne — ₹75L

Spinners set(18):
Ravi Bishnoi — ₹1.50 Cr
Wanindu Hasaranga — ₹2.00 Cr
Dunith Wellalage — ₹1.00 Cr
Mujeeb Ur Rahman — ₹1.50 Cr
Maheesh Theekshana — ₹1.50 Cr
Tom Hartley — ₹50L
Ish Sodhi — ₹1.00 Cr
Jalaj Saxena — ₹75L
Keshav Maharaj — ₹1.00 Cr
Rahul Chahar — ₹1.00 Cr
KC Cariappa — ₹75L
George Linde — ₹50L
Murugan Ashwin — ₹1.00 Cr
Jack Leach — ₹50L
Piyush Chawla — ₹75L
Adil Rashid — ₹1.00 Cr
Karn Sharma — ₹75L
Tabraiz Shamsi — ₹1.00 Cr

all rounders set(28):
David Wiese — ₹1.00 Cr
Daniel Sams — ₹75L
Cooper Connolly — ₹75L
Raj Bawa — ₹1.00 Cr
Kyle Mayers — ₹1.50 Cr
Daryl Mitchell — ₹1.50 Cr
Chris Woakes — ₹1.00 Cr
Deepak Hooda — ₹1.00 Cr
Roston Chase — ₹1.00 Cr
Matthew Short — ₹1.00 Cr
Shakib Al Hasan — ₹2.00 Cr
Fabian Allen — ₹50L
David Willey — ₹1.00 Cr
Aaron Hardie — ₹1.00 Cr
Vijay Shankar — ₹75L
Akeal Hosein — ₹1.00 Cr
Venkatesh Iyer — ₹2.00 Cr
Sikandar Raza — ₹1.50 Cr
Glenn Maxwell — ₹2.00 Cr
Wiaan Mulder — ₹75L
Mohammad Nabi — ₹75L
Odean Smith — ₹1.50 Cr
Dasun Shanaka — ₹1.00 Cr
Dwaine Pretorius — ₹1.50 Cr
Jimmy Neesham — ₹75L
Rachin Ravindra — ₹1.50 Cr
Jason Holder — ₹1.50 Cr
Michael Bracewell — ₹1.50 Cr

wicket keepers set(25):
Quinton de Kock — ₹2.00 Cr
Josh Philippe — ₹75L
Rahmanullah Gurbaz — ₹1.50 Cr
N Jagadeesan — ₹75L
Josh Inglis — ₹1.50 Cr
Kusal Perera — ₹1.00 Cr
Kyle Verreynne — ₹75L
Shai Hope — ₹1.50 Cr
Upendra Yadav — ₹75L
Litton Das — ₹1.00 Cr
Luvnith Sisodia — ₹75L
KS Bharat — ₹75L
Tom Kohler-Cadmore — ₹1.00 Cr
Matthew Wade — ₹1.00 Cr
Tim Seifert — ₹1.00 Cr
Tom Latham — ₹75L
Jordan Cox — ₹75L
Alex Carey — ₹1.00 Cr
Bhanuka Rajapaksa — ₹75L
Finn Allen — ₹1.00 Cr
Jamie Smith — ₹1.00 Cr
Kusal Mendis — ₹1.00 Cr
Tom Banton — ₹1.50 Cr
Jonny Bairstow — ₹2.00 Cr
Sam Billings — ₹1.00 Cr

uncapped players set(57):
Rahul Buddhi — ₹40L
Shivam Mavi — ₹50L
Lalit Yadav — ₹40L
Anmolpreet Singh — ₹40L
Kuldeep Sen — ₹40L
Sandeep Warrier — ₹40L
Arnav Sinha — ₹30L
Kamlesh Nagarkoti — ₹30L
Kartik Sharma — ₹30L
Tanush Kotian — ₹30L
Yuvraj Chaudhary — ₹40L
Harnoor Singh — ₹40L
Vicky Ostwal — ₹30L
Nikin Jose — ₹40L
Shaik Rasheed — ₹50L
Nishchal D — ₹30L
Simarjeet Singh — ₹40L
Krishnappa Gowtham — ₹30L
Kumar Kartikeya — ₹40L
Harpreet Brar — ₹50L
Yudhvir Singh — ₹50L
Priyam Garg — ₹50L
Akash Madhwal — ₹40L
Raj Limbani — ₹40L
Yash Dhull — ₹50L
Atharva Taide — ₹30L
Abid Mushtaq — ₹40L
Deepesh Nailwal — ₹30L
Swastik Chikara — ₹40L
Abhinav Manohar — ₹40L
Auqib Nabi — ₹30L
Prashant Veer — ₹30L
Prince Choudhary — ₹40L
Saurabh Dubey — ₹40L
Kartik Tyagi — ₹40L
Vihaan Malhotra — ₹30L
Vidwath Kaverappa — ₹40L
Arpit Guleria — ₹40L
Vivrant Sharma — ₹40L
Harshit Tomar — ₹30L
Mayank Dagar — ₹40L
Rajvardhan Hangargekar — ₹40L
Salil Arora- 40L
Mukul Choudhary — ₹40L
Mangesh Yadav — ₹40L
Rajesh Mohanty — ₹40L
Tushar Raheja — ₹40L
Nikhil Chaudhary — ₹50L
Saransh Jain — ₹40L
Akshat Raghuwanshi — ₹40L
Swastik Samal — ₹40L
Shreyas Chavan — ₹40L
Parikshit Dhanak — ₹40L
Manan Bhardwaj — ₹40L
Km Asif- 40L
Kulwant Khejroliya- 40L
Shubham Kumar- 40L
`;

const lines = rawText.split(/\r?\n/);
const players = [];

let currentSet = "";
let currentRole = "Batsman";

const marqueeRoles = {
  "Ben Stokes": "All-rounder", "Andre Russell": "All-rounder", "David Warner": "Batsman", 
  "Cameron Green": "All-rounder", "Steve Smith": "Batsman", "Kane Williamson": "Batsman", 
  "Liam Livingstone": "All-rounder"
};

for (const line of lines) {
  const t = line.trim();
  if (!t) continue;
  
  if (t.toLowerCase().includes('marquee players')) { currentSet = "Marquee Players"; continue; }
  if (t.toLowerCase().includes('batsmen')) { currentSet = "Batsmen"; currentRole = "Batsman"; continue; }
  if (t.toLowerCase().includes('fast bowlers')) { currentSet = "Fast Bowlers"; currentRole = "Fast Bowler"; continue; }
  if (t.toLowerCase().includes('spinners')) { currentSet = "Spinners"; currentRole = "Spinner"; continue; }
  if (t.toLowerCase().includes('all rounders')) { currentSet = "All Rounders"; currentRole = "All-rounder"; continue; }
  if (t.toLowerCase().includes('wicket keepers')) { currentSet = "Wicket Keepers"; currentRole = "Wicket Keeper"; continue; }
  if (t.toLowerCase().includes('uncapped players')) { currentSet = "Uncapped Players"; currentRole = "Batsman"; continue; }

  const match = t.match(/^(.*?)(?:—|-)\s*(?:₹?)?(\d+(?:\.\d+)?)\s*(Cr|L)/i);
  if (match) {
    const name = match[1].trim();
    const val = parseFloat(match[2]);
    const unit = match[3].toUpperCase();
    
    let basePrice = val;
    if (unit === 'L') {
      basePrice = val / 100;
    }
    
    let role = currentRole;
    if (currentSet === "Marquee Players" && marqueeRoles[name]) {
      role = marqueeRoles[name];
    }

    players.push({
      name,
      basePrice,
      set: currentSet,
      role: role,
      country: "Overseas"
    });
  }
}

fs.writeFileSync('../data/mini_players.json', JSON.stringify(players, null, 2), 'utf8');
console.log('Inserted ' + players.length + ' players into mini_players.json');
