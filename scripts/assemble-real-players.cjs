/**
 * Builds data/players.json from curated REAL cricketers only.
 * Base prices use IPL-style slabs: 0.2, 0.3, 0.5, 0.75, 1, 1.25, 1.5, 2 (₹ Cr).
 *
 * Run: node scripts/assemble-real-players.cjs
 */
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "../data/players.json");
const EXTRA_PATH = path.join(__dirname, "extra-player-rows.txt");

const MARQUEE = `
Virat Kohli	India	Batsman	Marquee Players	2
Rohit Sharma	India	Batsman	Marquee Players	2
Jasprit Bumrah	India	Bowler	Marquee Players	2
Hardik Pandya	India	All-rounder	Marquee Players	2
KL Rahul	India	Batsman	Marquee Players	2
Rishabh Pant	India	Wicketkeeper	Marquee Players	2
Suryakumar Yadav	India	Batsman	Marquee Players	2
Shreyas Iyer	India	Batsman	Marquee Players	2
Ravindra Jadeja	India	All-rounder	Marquee Players	2
Mohammed Siraj	India	Bowler	Marquee Players	2
Arshdeep Singh	India	Bowler	Marquee Players	2
Jos Buttler	England	Wicketkeeper	Marquee Players	2
Ben Stokes	England	All-rounder	Marquee Players	2
Jofra Archer	England	Bowler	Marquee Players	2
Liam Livingstone	England	All-rounder	Marquee Players	2
Rashid Khan	Afghanistan	Bowler	Marquee Players	2
Travis Head	Australia	Batsman	Marquee Players	2
Mitchell Starc	Australia	Bowler	Marquee Players	2
Pat Cummins	Australia	Bowler	Marquee Players	2
Heinrich Klaasen	South Africa	Wicketkeeper	Marquee Players	2
Nicholas Pooran	West Indies	Batsman	Marquee Players	2
Andre Russell	West Indies	All-rounder	Marquee Players	2
Phil Salt	England	Batsman	Marquee Players	2
Trent Boult	New Zealand	Bowler	Marquee Players	2
Cameron Green	Australia	All-rounder	Marquee Players	2
Varun Chakaravarthy	India	Bowler	Marquee Players	2
`.trim();

const BATS = `
Shubman Gill	India	Batsman	Batsmen	2
Yashaswi Jaiswal	India	Batsman	Batsmen	2
Ruturaj Gaikwad	India	Batsman	Batsmen	2
Aiden Markram	South Africa	Batsman	Batsmen	2
Harry Brook	England	Batsman	Batsmen	2
Devon Conway	New Zealand	Batsman	Batsmen	2
David Miller	South Africa	Batsman	Batsmen	2
Mitchell Marsh	Australia	Batsman	Batsmen	2
Tilak Varma	India	Batsman	Batsmen	1.5
Sai Sudharsan	India	Batsman	Batsmen	1.5
Rinku Singh	India	Batsman	Batsmen	1.5
Nitish Rana	India	Batsman	Batsmen	1.5
Shimron Hetmyer	West Indies	Batsman	Batsmen	1.5
Tim David	Australia	Batsman	Batsmen	1.5
Daryl Mitchell	New Zealand	Batsman	Batsmen	1.5
Kyle Mayers	West Indies	Batsman	Batsmen	1.5
Sherfane Rutherford	West Indies	Batsman	Batsmen	1
Devdutt Padikkal	India	Batsman	Batsmen	1
Rajat Patidar	India	Batsman	Batsmen	1
Deepak Hooda	India	Batsman	Batsmen	1
Rovman Powell	West Indies	Batsman	Batsmen	1
Jason Roy	England	Batsman	Batsmen	1
Pathum Nissanka	Sri Lanka	Batsman	Batsmen	1
Charith Asalanka	Sri Lanka	Batsman	Batsmen	1
Kusal Mendis	Sri Lanka	Batsman	Batsmen	1
Dewald Brevis	South Africa	Batsman	Batsmen	1
Tristan Stubbs	South Africa	Batsman	Batsmen	1
Prithvi Shaw	India	Batsman	Batsmen	0.75
Sarfaraz Khan	India	Batsman	Batsmen	0.75
Brandon King	West Indies	Batsman	Batsmen	0.75
Shahrukh Khan	India	Batsman	Batsmen	0.75
Manish Pandey	India	Batsman	Batsmen	0.5
Karun Nair	India	Batsman	Batsmen	0.5
Ibrahim Zadran	Afghanistan	Batsman	Batsmen	0.5
Najibullah Zadran	Afghanistan	Batsman	Batsmen	0.5
Reeza Hendricks	South Africa	Batsman	Batsmen	0.5
`.trim();

const FAST_BOWLERS = `
Bhuvneshwar Kumar	India	Bowler	Fast Bowlers	2
Deepak Chahar	India	Bowler	Fast Bowlers	2
Mohammed Shami	India	Bowler	Fast Bowlers	2
Kagiso Rabada	South Africa	Bowler	Fast Bowlers	2
Anrich Nortje	South Africa	Bowler	Fast Bowlers	2
Josh Hazlewood	Australia	Bowler	Fast Bowlers	2
Lockie Ferguson	New Zealand	Bowler	Fast Bowlers	2
Gerald Coetzee	South Africa	Bowler	Fast Bowlers	2
Mark Wood	England	Bowler	Fast Bowlers	2
Matheesha Pathirana	Sri Lanka	Bowler	Fast Bowlers	2
Harshit Rana	India	Bowler	Fast Bowlers	2
Prasidh Krishna	India	Bowler	Fast Bowlers	1.5
Harshal Patel	India	Bowler	Fast Bowlers	1.5
Avesh Khan	India	Bowler	Fast Bowlers	1.5
T Natarajan	India	Bowler	Fast Bowlers	1.5
Kyle Jamieson	New Zealand	Bowler	Fast Bowlers	1.5
Reece Topley	England	Bowler	Fast Bowlers	1.5
Lungi Ngidi	South Africa	Bowler	Fast Bowlers	1.5
Alzarri Joseph	West Indies	Bowler	Fast Bowlers	1.5
Mustafizur Rahman	Bangladesh	Bowler	Fast Bowlers	1.5
Dilshan Madushanka	Sri Lanka	Bowler	Fast Bowlers	1.5
Chris Jordan	England	Bowler	Fast Bowlers	1.5
Umesh Yadav	India	Bowler	Fast Bowlers	1
Umran Malik	India	Bowler	Fast Bowlers	1
Mukesh Kumar	India	Bowler	Fast Bowlers	1
Khaleel Ahmed	India	Bowler	Fast Bowlers	1
Sandeep Sharma	India	Bowler	Fast Bowlers	1
Nathan Ellis	Australia	Bowler	Fast Bowlers	1
Matt Henry	New Zealand	Bowler	Fast Bowlers	1
Dushmantha Chameera	Sri Lanka	Bowler	Fast Bowlers	1
Naveen-ul-Haq	Afghanistan	Bowler	Fast Bowlers	1
Fazalhaq Farooqi	Afghanistan	Bowler	Fast Bowlers	1
Josh Little	Ireland	Bowler	Fast Bowlers	1
Spencer Johnson	Australia	Bowler	Fast Bowlers	1
Akash Deep	India	Bowler	Fast Bowlers	1
Navdeep Saini	India	Bowler	Fast Bowlers	0.75
Chetan Sakariya	India	Bowler	Fast Bowlers	0.75
Jaydev Unadkat	India	Bowler	Fast Bowlers	0.75
Yash Dayal	India	Bowler	Fast Bowlers	0.75
Nuwan Thushara	Sri Lanka	Bowler	Fast Bowlers	0.75
Obed McCoy	West Indies	Bowler	Fast Bowlers	0.75
Luke Wood	England	Bowler	Fast Bowlers	0.75
Adam Milne	New Zealand	Bowler	Fast Bowlers	0.75
Riley Meredith	Australia	Bowler	Fast Bowlers	0.75
Ishant Sharma	India	Bowler	Fast Bowlers	0.5
Blessing Muzarabani	Zimbabwe	Bowler	Fast Bowlers	0.5
Tymal Mills	England	Bowler	Fast Bowlers	0.5
Richard Gleeson	England	Bowler	Fast Bowlers	0.5
Sean Abbott	Australia	Bowler	Fast Bowlers	0.5
Ben Dwarshuis	Australia	Bowler	Fast Bowlers	0.5
Scott Boland	Australia	Bowler	Fast Bowlers	0.5
`.trim();

const SPINNERS = `
Yuzvendra Chahal	India	Bowler	Spinners	2
Kuldeep Yadav	India	Bowler	Spinners	2
Wanindu Hasaranga	Sri Lanka	Bowler	Spinners	2
Ravi Bishnoi	India	Bowler	Spinners	1.5
Noor Ahmad	Afghanistan	Bowler	Spinners	1.5
Maheesh Theekshana	Sri Lanka	Bowler	Spinners	1.5
Mujeeb Ur Rahman	Afghanistan	Bowler	Spinners	1.5
Rahul Chahar	India	Bowler	Spinners	1
Adil Rashid	England	Bowler	Spinners	1
Tabraiz Shamsi	South Africa	Bowler	Spinners	1
Keshav Maharaj	South Africa	Bowler	Spinners	1
Ish Sodhi	New Zealand	Bowler	Spinners	1
Amit Mishra	India	Bowler	Spinners	0.75
Karn Sharma	India	Bowler	Spinners	0.75
Piyush Chawla	India	Bowler	Spinners	0.75
`.trim();

const AR = `
Glenn Maxwell	Australia	All-rounder	AllRounders	2
Marcus Stoinis	Australia	All-rounder	AllRounders	2
Sam Curran	England	All-rounder	AllRounders	2
Shakib Al Hasan	Bangladesh	All-rounder	AllRounders	2
Sunil Narine	West Indies	All-rounder	AllRounders	2
Axar Patel	India	All-rounder	AllRounders	2
Venkatesh Iyer	India	All-rounder	AllRounders	2
Abhishek Sharma	India	All-rounder	AllRounders	2
Shivam Dube	India	All-rounder	AllRounders	2
Will Jacks	England	All-rounder	AllRounders	2
Marco Jansen	South Africa	All-rounder	AllRounders	1.5
Jason Holder	West Indies	All-rounder	AllRounders	1.5
Romario Shepherd	West Indies	All-rounder	AllRounders	1.5
Sikandar Raza	Zimbabwe	All-rounder	AllRounders	1.5
Mitchell Santner	New Zealand	All-rounder	AllRounders	1.5
Washington Sundar	India	All-rounder	AllRounders	1.5
Rachin Ravindra	New Zealand	All-rounder	AllRounders	1.5
Glenn Phillips	New Zealand	All-rounder	AllRounders	1.5
Krunal Pandya	India	All-rounder	AllRounders	1.5
Jacob Bethell	England	All-rounder	AllRounders	1
Chris Woakes	England	All-rounder	AllRounders	1
Dasun Shanaka	Sri Lanka	All-rounder	AllRounders	1
Shardul Thakur	India	All-rounder	AllRounders	1
Rahul Tewatia	India	All-rounder	AllRounders	1
Akeal Hosein	West Indies	All-rounder	AllRounders	1
Roston Chase	West Indies	All-rounder	AllRounders	1
David Wiese	South Africa	All-rounder	AllRounders	1
Nitish Kumar Reddy	India	All-rounder	AllRounders	1
David Willey	England	All-rounder	AllRounders	1
Jimmy Neesham	New Zealand	All-rounder	AllRounders	0.75
Azmatullah Omarzai	Afghanistan	All-rounder	AllRounders	0.75
Mohammad Nabi	Afghanistan	All-rounder	AllRounders	0.75
Vijay Shankar	India	All-rounder	AllRounders	0.75
Corbin Bosch	South Africa	All-rounder	AllRounders	0.75
Daniel Sams	Australia	All-rounder	AllRounders	0.75
`.trim();

const WK = `
Quinton de Kock	South Africa	Wicketkeeper	WicketKeepers	2
Sanju Samson	India	Wicketkeeper	WicketKeepers	2
Ishan Kishan	India	Wicketkeeper	WicketKeepers	2
Jonny Bairstow	England	Wicketkeeper	WicketKeepers	2
Jitesh Sharma	India	Wicketkeeper	WicketKeepers	1.5
Rahmanullah Gurbaz	Afghanistan	Wicketkeeper	WicketKeepers	1.5
Josh Inglis	Australia	Wicketkeeper	WicketKeepers	1.5
Dhruv Jurel	India	Wicketkeeper	WicketKeepers	1.5
Shai Hope	West Indies	Wicketkeeper	WicketKeepers	1.5
MS Dhoni	India	Wicketkeeper	WicketKeepers	1.5
Tom Banton	England	Wicketkeeper	WicketKeepers	1
Alex Carey	Australia	Wicketkeeper	WicketKeepers	1
Matthew Wade	Australia	Wicketkeeper	WicketKeepers	1
Kusal Perera	Sri Lanka	Wicketkeeper	WicketKeepers	1
Ryan Rickelton	South Africa	Wicketkeeper	WicketKeepers	1
Finn Allen	New Zealand	Wicketkeeper	WicketKeepers	1
Tim Seifert	New Zealand	Wicketkeeper	WicketKeepers	1
KS Bharat	India	Wicketkeeper	WicketKeepers	0.75
Jordan Cox	England	Wicketkeeper	WicketKeepers	0.75
Kyle Verreynne	South Africa	Wicketkeeper	WicketKeepers	0.75
`.trim();

const UNCAPPED = `
Yash Dhull	India	Batsman	Uncapped Players	0.5
Angkrish Raghuvanshi	India	Batsman	Uncapped Players	0.5
Shaik Rasheed	India	Batsman	Uncapped Players	0.5
Sameer Rizvi	India	Batsman	Uncapped Players	0.5
Nehal Wadhera	India	Batsman	Uncapped Players	0.5
Priyam Garg	India	Batsman	Uncapped Players	0.5
Shashank Singh	India	All-rounder	Uncapped Players	0.5
Prabhsimran Singh	India	Batsman	Uncapped Players	0.5
Ayush Badoni	India	Batsman	Uncapped Players	0.5
Anuj Rawat	India	Batsman	Uncapped Players	0.5
Abdul Samad	India	All-rounder	Uncapped Players	0.5
Ashutosh Sharma	India	Batsman	Uncapped Players	0.5
Shivam Mavi	India	All-rounder	Uncapped Players	0.5
Harpreet Brar	India	All-rounder	Uncapped Players	0.5
Swapnil Singh	India	All-rounder	Uncapped Players	0.5
Anukul Roy	India	All-rounder	Uncapped Players	0.5
Mayank Yadav	India	Bowler	Uncapped Players	0.5
Mohsin Khan	India	Bowler	Uncapped Players	0.5
Tushar Deshpande	India	Bowler	Uncapped Players	0.5
Harnoor Singh	India	Batsman	Uncapped Players	0.4
Rahul Buddhi	India	Batsman	Uncapped Players	0.4
Nikin Jose	India	Batsman	Uncapped Players	0.4
Ramakrishna Ghosh	India	Batsman	Uncapped Players	0.4
Abhishek Porel	India	Batsman	Uncapped Players	0.4
Kumar Kushagra	India	Batsman	Uncapped Players	0.4
Nishant Sindhu	India	All-rounder	Uncapped Players	0.4
Ramandeep Singh	India	All-rounder	Uncapped Players	0.4
Lalit Yadav	India	All-rounder	Uncapped Players	0.4
R Sai Kishore	India	Bowler	Uncapped Players	0.4
Kumar Kartikeya	India	Bowler	Uncapped Players	0.4
Akash Madhwal	India	Bowler	Uncapped Players	0.4
Arjun Tendulkar	India	Bowler	Uncapped Players	0.4
Vaibhav Arora	India	Bowler	Uncapped Players	0.4
Vyshak Vijaykumar	India	Bowler	Uncapped Players	0.4
Rasikh Salam Dar	India	Bowler	Uncapped Players	0.4
Suyash Prabhudessai	India	Batsman	Uncapped Players	0.4
Shubham Dubey	India	Batsman	Uncapped Players	0.4
Yash Thakur	India	Bowler	Uncapped Players	0.4
Kuldeep Sen	India	Bowler	Uncapped Players	0.4
Vidwath Kaverappa	India	Bowler	Uncapped Players	0.4
Rajvardhan Hangargekar	India	Bowler	Uncapped Players	0.4
Digvesh Rathi	India	Bowler	Uncapped Players	0.4
Suyash Sharma	India	Bowler	Uncapped Players	0.4
Priyansh Arya	India	Batsman	Uncapped Players	0.3
Vipraj Nigam	India	Batsman	Uncapped Players	0.3
Vicky Ostwal	India	Batsman	Uncapped Players	0.3
Manav Suthar	India	Batsman	Uncapped Players	0.3
Shreyas Gopal	India	Bowler	Uncapped Players	0.3
Atharva Taide	India	Batsman	Uncapped Players	0.3
Mukesh Choudhary	India	Bowler	Uncapped Players	0.3
Arshin Kulkarni	India	Bowler	Uncapped Players	0.3
Manimaran Siddharth	India	Bowler	Uncapped Players	0.3
Prashant Veer	India	Bowler	Uncapped Players	0.3
Kartik Sharma	India	Bowler	Uncapped Players	0.3
Krishnappa Gowtham	India	Bowler	Uncapped Players	0.3
Robin Minz	India	Batsman	Uncapped Players	0.3
Hrithik Shokeen	India	Batsman	Uncapped Players	0.3
Tanush Kotian	India	Batsman	Uncapped Players	0.3
Kamlesh Nagarkoti	India	Bowler	Uncapped Players	0.3
Yudhvir Singh Charak	India	Bowler	Uncapped Players	0.3
Ayush Mhatre	India	Bowler	Uncapped Players	0.3
Vaibhav Suryavanshi	India	Bowler	Uncapped Players	0.3
Anshul Kamboj	India	Bowler	Uncapped Players	0.3
Auqib Nabi	India	Bowler	Uncapped Players	0.3
Vihaan Malhotra	India	Bowler	Uncapped Players	0.3
Akash Singh	India	Bowler	Uncapped Players	0.3
`.trim();

const UNSOLD = `
`.trim();

function parseBlock(block) {
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, country, role, category, price] = line.split("\t");
      return {
        name: name.trim(),
        country: country.trim(),
        role: role.trim(),
        category: category.trim(),
        basePrice: Number(price),
      };
    });
}

function main() {
  let extraBlock = "";
  try {
    extraBlock = fs.readFileSync(EXTRA_PATH, "utf8");
  } catch {
    extraBlock = "";
  }

  const sections = [
    parseBlock(MARQUEE),
    parseBlock(BATS),
    parseBlock(FAST_BOWLERS),
    parseBlock(SPINNERS),
    parseBlock(AR),
    parseBlock(WK),
    parseBlock(UNCAPPED),
    parseBlock(UNSOLD),
    ...(extraBlock.trim() ? [parseBlock(extraBlock.trim())] : []),
  ];

  const flat = sections.flat();
  const seen = new Set();
  const unique = [];
  const EXCLUDED_COUNTRIES = new Set([
    "Pakistan",
    "Nepal",
    "Oman",
    "Papua New Guinea",
    "Ghana",
    "Namibia",
  ]);
  for (const p of flat) {
    const k = p.name.toLowerCase();
    if (seen.has(k)) continue;
    const country = (p.country || "").trim();
    if (EXCLUDED_COUNTRIES.has(country)) continue;
    seen.add(k);
    unique.push(p);
  }

  if (unique.length < 300) {
    console.error(
      `Only ${unique.length} unique players after exclusions; need 300+.`
    );
    process.exit(1);
  }

  const trimmed = unique.slice(0, Math.min(unique.length, 400));
  
  // Map category + role to set name (canonical set names)
  const categoryRoleToSet = (category, role) => {
    if (!category || category === "" || category.toLowerCase() === "uncapped") {
      return "Uncapped Players";
    }

    const normalized = category.trim();
    if (normalized === "Marquee" || normalized === "Marquee Players") {
      return "Marquee Players";
    }
    if (normalized === "Batsmen") {
      return "Batsmen";
    }
    if (normalized === "Fast Bowlers") {
      return "Fast Bowlers";
    }
    if (normalized === "Spinners") {
      return "Spinners";
    }
    if (normalized === "AllRounders" || normalized === "All Rounders" || normalized === "All-rounders") {
      return "All Rounders";
    }
    if (normalized === "WicketKeepers" || normalized === "Wicket Keepers") {
      return "Wicket Keepers";
    }
    if (normalized === "Capped") {
      if (role === "Batsman") return "Batsmen";
      if (role === "Bowler" || role === "Fast Bowler") return "Fast Bowlers";
      if (role === "Spinner") return "Spinners";
      if (role === "All-rounder") return "All Rounders";
      if (role === "Wicketkeeper") return "Wicket Keepers";
    }
    return "Uncapped Players";
  };
  
  const players = trimmed.map((p, i) => ({
    id: i + 1,
    name: p.name,
    country: p.country,
    role: p.role,
    basePrice: p.basePrice,
    set: categoryRoleToSet(p.category, p.role),
  }));

  fs.writeFileSync(OUT, JSON.stringify(players, null, 2), "utf8");
  console.log(`Wrote ${players.length} real players to ${OUT}`);
}

main();
