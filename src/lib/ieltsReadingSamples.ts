export interface ReadingSampleQuestion {
  text: string;
  correctAnswer?: string;
  options?: string[];
}

export interface ReadingSampleGroup {
  questionType: string;
  instructions: string;
  matchingOptions?: string[];
  questions: ReadingSampleQuestion[];
}

export interface ReadingSample {
  ieltsType: "Academic" | "General";
  passage: string;
  questionGroups: ReadingSampleGroup[];
}

// Editable few-shot samples for reading generation quality.
export const READING_SAMPLES: ReadingSample[] = [
  {
    ieltsType: "Academic",
    passage:
      `A. Recent years have seen a barrage of dystopian Young Adult novels grow in popularity almost overnight, from The Hunger Games to The Maze Runner and The 5th Wave, to name just a few. These novels, set in postapocalyptic, totalitarian or otherwise ruthless and turbulent settings, have gained such momentum that the trend has seeped into the film and TV industries as well, with some becoming bestsellers before even reaching the big and small screen. But what is it about dystopian stories that makes them so appealing to readers and audiences alike?

B. Dystopias are certainly nothing new. The word "dystopia" itself, meaning "bad place", derives from the Greek 'dus' and 'topos', and has been used in political writing and discourse for centuries. The first dystopian novel was Yevgeny Zamyatin's We (1932), and Orwell's 1984 (1949), commonly regarded as the first dystopian novels that fit firmly into the genre, were published more than 75 years ago. Even the first YA dystopian novel is older than 20 years. Lois Lowry's The Giver, which came out in 1993, was perhaps the first in what came to be known as dystopian YA literature. This means, however, that one cannot simply attribute this trend to the fact that bookstores are stocked with dozens of dystopian titles.

C. According to film critic Dana Stevens, it is the similarities that can be drawn between dystopian settings and the daily lives of teenagers that make YA dystopian stories so captivating; the high school experience involves adolescents trying to establish and maintain categories and groups where they fit in. In the world of Divergent, teenagers might not literally have to fight each other to the death or go through horrendous trials to join a virtue-based faction for the rest of their lives, but there is something in each story that connects to their own backgrounds. The pressure to fit into one social clique might not be all that dissimilar to Tris's faction dilemma in Divergent.

D. Justin Scholes and Jon Ostenson's 2013 study reports similar findings, identifying themes such as "inhumanity and isolation", the struggle to establish identity and the development of platonic and romantic relationships as among the common denominator themes in YA dystopian and romantic literature as a whole. Deconstructivist theories similarly argue that the topics explored by dystopian literature are appealing to teenagers because they are "an appropriate fit with the intellectual changes that occur during adolescence"; as teenagers gradually grow into adults, they develop an interest in social issues and current affairs. Dystopian novels, according to several scholars and booksellers, can therefore appeal to readers as they do not patronise their readers, nor do they attempt to sugar-coat reality.

E. All of this still does not explain why this upsurge in YA dystopian literature is happening now, though. Bestselling author Naomi Klein offers a different explanation: the dystopian trend, she says, is a "worrying sign" of times to come. What all these dystopian stories have in common is that they all assume that environmental catastrophe is not only imminent, but also completely inevitable. Moral principles emerge through these works of fiction, particularly for young people, as they are the ones who will bear the brunt of climate change. YA author Todd Mitchell makes a similar point, suggesting that the bleak futures portrayed in modern YA literature are a response to "social anxiety" brought forth by pollution and over-consumption.

F. The threat of natural disasters is not the only reason YA dystopian novels are so popular today, however. As author Claudia Gray notes, what has also changed in recent years is humanity's approach to personal identity and young people's roles in society. Adolescents, she says, are increasingly dragged into rigid moulds through "increased standardised testing, increased homework levels, etc." YA dystopian novels come into play because they present protagonists who refuse to be defined by someone else, role models who battle against the status quo.

G. So, how long is this YA dystopian trend going to last? If The Guardian is to be believed, it has already been replaced by a new wave of "gritty" realism as seen in the likes of The Fault in Our Stars, by John Green. Profits have certainly dwindled for dystopian film franchises such as Divergent. This has not stopped film companies from scheduling new releases, however, and TV series such as The 100 are still on air. Perhaps the market for dystopian novels has stagnated - only time will tell. One thing is for certain, however: the changes the trend has effected on YA literature are here to stay.`,
    questionGroups: [
      {
        questionType: "matching_headings",
        instructions:
          "Questions 1-7. The reading passage has seven paragraphs, A-G. Choose the correct heading for paragraphs A-G from the list of headings below.",
        matchingOptions: [
          "I. Teens are increasingly urged to conform",
          "II. The dystopian model scrutinised",
          "III. Dystopian novels now focus on climate change",
          "IV. The original dystopias",
          "V. Dystopian literature's accomplishments will outlive it",
          "VI. A score of dystopian novels has taken over YA shelves",
          "VII. The roots of dystopia can be found in teenage experiences",
          "VIII. Dystopia is already dead",
          "IX. Dystopias promote ethical thinking",
        ],
        questions: [
          { text: "Paragraph A" },
          { text: "Paragraph B" },
          { text: "Paragraph C" },
          { text: "Paragraph D" },
          { text: "Paragraph E" },
          { text: "Paragraph F" },
          { text: "Paragraph G" },
        ],
      },
      {
        questionType: "short_answer",
        instructions:
          "Questions 8-12. Answer the questions below with words taken from Reading Passage 1. Use NO MORE THAN THREE WORDS for each answer.",
        questions: [
          { text: "According to the writer, what was the first dystopian novel?" },
          { text: "According to the writer, which author initiated the YA dystopian genre?" },
          { text: "How does Dave Astor describe dystopian novels?" },
          { text: "According to Naomi Klein, which element is present in all dystopian novels?" },
          { text: "According to Claudia Gray, things like increased standardised testing and homework levels are a threat to what?" },
        ],
      },
      {
        questionType: "multiple_choice",
        instructions: "Question 13. Choose the correct letter, A, B, C or D.",
        questions: [
          {
            text: "Which is the best title for Reading Passage 1?",
            options: [
              "A. A history of YA dystopian literature",
              "B. The wave of the dystopian phenomenon",
              "C. How dystopian fiction has shaped the world",
              "D. The draw of YA dystopian fiction",
            ],
          },
        ],
      },
    ],
  },
  {
    ieltsType: "Academic",
    passage:
      `Reading Passage 2 - Plant Wars

Mention the words "chemical warfare" or "deployed armies" in any conversation, and your interlocutor might immediately assume you are talking about wars between humans. In fact, however, there are other kinds of war out there where these techniques are employed far more frequently and in a far more intricate manner: those waged in the plant kingdom.

We might not normally think of plants this way, but much like humans and animals, they too have to fight for survival on a daily basis. Nutrients, light and water are the three things any plant needs in order to grow; unfortunately, none of these is ample in supply, which means that competition between plants can grow fierce. Some plants and trees are at an advantage: taller trees have greater access to natural light, while plants with deeper roots have the ability to absorb more water and nutrients. Others, though, manage to defend their territory through "allelopathy", or chemical warfare.

So how does this chemical warfare work exactly? As Dr Robin Andrews explains, plants convert the nutrients they absorb from the ground to energy with the aid of a type of organic compounds known as metabolites. These metabolites can be divided into two categories: primary and secondary. Primary metabolites are what allows a plant to live, playing a direct role in its growth and development, and are thus present in every plant. Secondary metabolites, on the other hand, can vary from plant to plant and often play the role of a defence mechanism against neighbouring competitors.

Out of these secondary metabolites, there are two that are incredibly interesting: DIBOA and DIMBOA. These two cyclic hydroxamic acids were at the forefront of a study conducted by Sascha Venturelli and colleagues in 2015, which found that once they are released into the soil by the plants that produce them, they degenerate into toxic substances that have the power to inhibit growth in nearby plants once they soak them up. As Dr Claude Becker notes, this phenomenon itself "has been known for years", but we now finally understand the "molecular mechanism" behind it - and its supreme intricacy would put to shame any chemical bombs created by humans.

But plants do not just fight wars against other plants; chemical warfare also comes into play in their defence against herbivores. As Brent Mortensen of Iowa State University describes, plants "actively resist" attacks made by herbivores through qualitative and quantitative chemical defences. Qualitative defences can be lethal even in small doses, and are often employed to protect "young" or "tender leaves or seeds". They can also be recycled when no longer necessary. Quantitative defences, in contrast, are only effective "in larger doses", but unlike qualitative defences, can protect the plant against all herbivores. Quantitative defences are also not as immediately lethal, as they usually lead to indigestion, pain, irritation of the mouth and throat, and inflammation or swelling in the skin.

And what about the "deployed armies" mentioned before? Well, chemical attacks are not the only way plants elect to defend themselves against herbivores. Some plants, such as the African acacia, also recruit armies to assist them in their war. As Angela White of the University of Sheffield explains, the acacia tree has "hollowed-out structures" which invite ant colonies to build a home in them by providing not just shelter, but also food in the form of a special nectar. In return, ants protect them against herbivores - and this includes not just the small ones like bugs, but also the ones as big as giraffes.

At this point, of course, you might be wondering what all this has to do with you. The territorial nature of plants might be fascinating in its own right, but what is its application in real life? Well, Dr Venturelli of the 2015 study mentioned before has an answer for you: apparently, certain allelochemicals - the aforementioned chemical compounds that are responsible for stunting growth in plants - have been found to have an effect on human cancer cells, too. According to Michael Bitzer and Ulrich Lauer of the same study, "clinical trials at the University Clinics Tubingen currently assess the efficacy of these plant toxins in cancer patients". This means that comprehending the way plants defend themselves against the enemies in their environment might not just be of interest to plant biologists alone, but to medical researchers as well.`,
    questionGroups: [
      {
        questionType: "sentence_completion",
        instructions:
          "Questions 14-20. Complete the sentences below. Choose NO MORE THAN THREE WORDS from Reading Passage 2 for each answer.",
        questions: [
          { text: "Plants are very similar to ______ as they also struggle to stay alive every day." },
          { text: "The height of a tree or plant can affect how much ______ it receives." },
          { text: "Chemical warfare in plants also goes by the name of ______." },
          { text: "Water and nutrients are both taken from the soil, and the latter is later turned into ______." },
          { text: "Secondary metabolites are an ______ that functions as a defence mechanism for plants." },
          { text: "DIBOA and DIMBOA are two types of secondary metabolites that can ______ once absorbed by a plant." },
          { text: "The 2015 study by Sascha Venturelli and colleagues examined the ______ of chemical warfare in plants." },
        ],
      },
      {
        questionType: "summary_completion",
        instructions:
          "Questions 21-25. Complete the diagram below. Choose NO MORE THAN TWO WORDS from Reading Passage 2 for each answer.",
        questions: [
          { text: "21. QUALITATIVE: can kill a herbivore in ______." },
          { text: "22. SECONDARY: effective against ______." },
          { text: "23. SECONDARY: causes a variety of symptoms, none ______." },
          { text: "24. INDIRECT: uses the help of ant colonies that reside in its ______." },
          { text: "25. INDIRECT: ants can protect plants against herbivores of all sizes, even ______." },
        ],
      },
      {
        questionType: "true_false_not_given",
        instructions:
          "Questions 26-27. Do the following statements agree with the information given in Reading Passage 2? Write TRUE if the statement agrees with the information, FALSE if the statement does not agree with the information, NOT GIVEN if there is no information on this.",
        questions: [
          { text: "Allelochemicals are secondary metabolites." },
          { text: "Plant biologists and medical researchers are currently cooperating to assess the efficacy of plant toxins in preventing the growth of cancer cells." },
        ],
      },
    ],
  },
  {
    ieltsType: "Academic",
    passage:
      `Reading Passage 3 - Deafhood

A. At this point you might be wondering: what does "deafhood" mean? Is it a synonym for "deafness"? Is it a slightly more politically correct term to express the same concept? What is wrong with terms such as "hard of hearing" or "deafness"? Who came up with "deafhood" and why?

B. The term "Deafhood" was first coined in 1993 by Dr Paddy Ladd, a deaf scholar in the Deaf Studies Department at the University of Bristol in England. First explored through his doctoral dissertation in 1998, and later elaborated in his 2003 book, Understanding Deaf Culture: In Search of Deafhood, the idea behind Deafhood is twofold: first, it seeks to collect everything that is already known about the life, culture and politics of Sign Language Peoples (SLPs); secondly, it attempts to remove the limitations imposed on SLPs through colonisation from hearing people.

C. In order to understand what Deafhood represents, it is first important to understand what is meant by colonisation. To do that, we need to examine two terms: Oralism and Audism. Oralism is a philosophy that first emerged in the late 19th century, and which suggests that reduced use of sign language would be more beneficial to SLPs, as it would allow them to integrate better in the hearing world. In that respect, sign language is dismissively regarded as an obstacle to listening skills and acquisition of speech - treated, in effect, in the same manner as the languages of other peoples who were oppressed and colonised, e.g. the Maori in New Zealand, or the Aborigines in Australia. Audism, first coined in 1975 by Dr Tom Humphries of the University of California in San Diego, describes the belief that deaf people are somehow inferior to hearing people, and that "deafhood", in this case, should be seen as a flaw, a terrible disability that needs to be eliminated. It is the effect of these two ideologies that Deafhood seeks to counter, by presenting SLPs in a positive light, not as patients who require treatment.

D. But even if we understand the oppression that SLPs have suffered at the hands of hearing people since the late 1800s, and even if we acknowledge that "deafness" is a medical term with negative connotations that needs to be replaced, that does not mean it is easy to explain what the term Deafhood represents exactly. This is because Deafhood is, as Dr Donald Grushkin puts it, "a physical, emotional, mental, spiritual, cultural and linguistic" journey that every deaf person is invited - but not obligated - to embark on.

E. Deafhood is essentially a search for understanding: what does being Deaf mean? How did deaf people in the past define themselves, and what did they believe to be their reasons for existing before Audism was conceived? Why are some people born deaf? Are there biological defects, or are there more positive reasons for their existence? What do terms like "Deaf Art" or "Deaf Culture" actually mean? What is "the Deaf Way" of doing things? True Deafhood is achieved when a deaf person feels comfortable with who they are and connected to the rest of the deaf community through use of their natural language, but the journey might differ.

F. Aside from all those questions, Deafhood also seeks to counter the effect of what is known as "neo-eugenics". Neo-eugenics is a modern manifestation of what has traditionally been defined as eugenics, i.e. an attempt to eradicate any human characteristics perceived as negative. Deaf people have previously been a target of eugenics through the ideologies of Audism and Oralism, but recent developments in science and society - such as cochlear implants or genetic engineering - mean that Deafhood is once again under threat, and needs to be protected. The only way to do this is by celebrating the community's history, language, and contributions to the world.

G. So, how do we go forward? We should start by decolonising SLPs, by embracing Deafhood for what it is, removing the negative connotations that surround it and accepting that deaf people are neither broken nor incomplete. This is a task not just for hearing people, but for deaf people as well, who have for decades internalised society's unfavourable views of them. We should also seek recognition of the deaf community's accomplishments, as well as official recognition of sign languages around the world by their respective governments. Effectively, what we should do is ask ourselves how the Deaf community would be like had it never been colonised by the mainstream world - and then strive to achieve it together.`,
    questionGroups: [
      {
        questionType: "matching",
        instructions:
          "Questions 28-34. The reading passage has seven paragraphs, A-G. Which paragraph contains the following information?",
        matchingOptions: [
          "Paragraph A",
          "Paragraph B",
          "Paragraph C",
          "Paragraph D",
          "Paragraph E",
          "Paragraph F",
          "Paragraph G",
        ],
        questions: [
          { text: "28. Examples of other groups treated the same way as deaf people" },
          { text: "29. Why the word 'deafness' is no longer appropriate" },
          { text: "30. The definition of the word 'deaf'" },
          { text: "31. Why deaf people might sometimes think negatively of themselves" },
          { text: "32. How one can attain deafhood" },
          { text: "33. Where the word 'deafhood' came from" },
          { text: "34. Why deafhood is currently imperilled" },
        ],
      },
      {
        questionType: "multiple_choice",
        instructions: "Questions 35-37. Choose the correct letter, A, B, C or D.",
        questions: [
          {
            text: "35. According to Dr Paddy Ladd, Deafhood",
            options: [
              "A. is a more appropriate term than 'hard of hearing'.",
              "B. doesn't colonise SLPs as much as 'deafness' does.",
              "C. strives to get rid of the effects of colonisation.",
              "D. contributes positively to the life and culture of deaf people.",
            ],
          },
          {
            text: "36. Oralism suggests that",
            options: [
              "A. SLPs have no use for sign language.",
              "B. SLPs don't belong in the hearing world.",
              "C. hearing people are superior to SLPs.",
              "D. SLPs are unable to acquire speech.",
            ],
          },
          {
            text: "37. Aborigines in Australia are similar to deaf people because",
            options: [
              "A. eugenicists also tried to eradicate them.",
              "B. they were also considered inferior by their oppressors.",
              "C. their languages were also disrespected.",
              "D. their languages were also colonised.",
            ],
          },
        ],
      },
      {
        questionType: "short_answer",
        instructions:
          "Questions 38-40. Answer the questions below with words taken from Reading Passage 3. Use NO MORE THAN TWO WORDS for each answer.",
        questions: [
          { text: "What should deaf people use to communicate with each other, according to deafhood?" },
          { text: "Who has used oralism and audism to attack the deaf community?" },
          { text: "What does the deaf community strive to achieve for sign language worldwide?" },
        ],
      },
    ],
  },
  {
    ieltsType: "General",
    passage:
      `Section 1 - Questions 1-13

On the following page are different notices and advertisements for various leisure activities in the town of Westley. Each notice or advertisement has a letter (A-E) next to it.

A. Westley Baths
Whether it's a gentle swim on your own, 80 lengths in an organised lane session with a coach, a splash with the kids or just a relaxing wallow, Westley Baths can provide you with the ultimate choice of swimming.
- Lifeguard always on duty
- Open 7 days a week
- Cafe and viewing gallery
- OAP, children and unemployed concessions
- Junior lessons
- Equipment shop

B. The Hawker Harriers
Twice a week, 52 weeks of the year the Hawker Harriers meet after work to enjoy running in different locations. There are 3 different levels (2 mile gentle jogs, 4 mile medium level runs and 6 mile runs for the fitter among us). There's no cost. Just turn up and enjoy some exercise and meet some new people. We have a regular programme of social events so the Hawker Harriers could transform your life in more ways than one! Call Nigel on 01386537 402 for details of our next meet.

C. Keep Fit!!
Join Linda on Tues, Wed and Fri mornings for her impact aerobics workout. With 2 sessions on each of the above days (9.30 + 11.00), you have a choice of time and intensity (9.00am is low impact and 11.00am is high impact). Meet at St. Stephen's Church Hall.

D. Westley Hiking Club
The Hiking Club meets every week on Tuesday nights in the Swan pub in order to organise its weekend hike. We try and organise as many different trips as possible whilst still visiting favourite places regularly. Some hikes are of an easy grade while others require a reasonable level of fitness. You will need to own your own boots and backpack and also overnight gear if we go on a longer hike - we don't stay in hotels!!! Recent expeditions have been to the Lake District, the Dales, the Westley Moors and even the Pyrenees!! Come and meet us at the Swan and give yourself the chance of keeping fit and seeing the most stunning countryside available.

E. Westley Bridge Club
The Westley Bridge Club members meet regularly in the British Legion building on Stamford Street to pit their wits against each other at the king of card games. If you would like to join in, come to any of the weekly sessions listed below and meet us. You don't need a partner as there are plenty of people who come on their own. There is a modest subscription to cover the room costs but your first visit is free.
Tues. 10.30am - 12.30pm
Thurs. 3.00pm - 5.00pm
Sat. 7.30pm - 10.30pm

The Week 1 July Programme for the Westley Arts Centre has information on various events. These events are marked into sections A-F.

A. Film Club
This week we have two films. The first is a documentary on whale hunting and the effect on their numbers around the world and the second is the old French favourite Jean de Florette. The first film will be shown on Monday and Thursday and the second film will be shown on Wednesday. All film presentations begin at 7.30pm. Tickets £3.50.

B. The Sunrise Rock Group's Sophie Alexander
Alexandra, front singer for the Sunrise, the famous rock group, will be here on Friday night with acoustic guitar and nothing else to give us an "unplugged" concert featuring songs from her solo album. This will be a popular concert so turn up early to be sure of getting a ticket. Tickets £8.

C. Concert by the Westley Youth Orchestra
Thursday night we will be entertained by the Westley Youth Orchestra playing a selection of popular tunes. Starting at 8.00pm and going on for 2 hours this will be a great evening of music. Tickets £2.50 though a voluntary donation to the orchestra of £5 will be appreciated.

D. Poetry
Poets Joanna Perry and Evie Belchier have won several awards for their distinctive and innovative writing. Joanna has just published her third collection of poetry to critical acclaim and on Wednesday night she will be reading poems from her new book and from her two old ones. We will also hear previously unpublished material. Evie, a relative newcomer, will read from her first novel which has just been published. After the reading there is a wine reception which Evie and Joanna will attend. Tickets £5.

E. Dinner Dance
Saturday night is our monthly dinner dance. With music by the Ron Jones Group and the usual excellent food we will have a great night dining and dancing. As always in July and August we will trust the British weather and enjoy the evening in the open air in the Arts Centre rose garden. Tickets £30 per head.

F. Special Exhibition
On Thursday and Friday we have the honour of being able to display the "Egyptian Artifacts" exhibition which is touring the country on loan from the British Museum in London. This exciting exhibition contains over 500 separate exhibits and has received stunning reviews around the country. We are expecting very high interest in this exhibition and we therefore recommend that, to avoid disappointment, you purchase a ticket in advance. You can buy tickets over the phone with a credit card or from the box office during our normal opening hours. Tickets £10.`,
    questionGroups: [
      {
        questionType: "matching",
        instructions:
          "Questions 1-6. Look at the statements below that relate to the notices and advertisements A-E. Write the correct letter, A-E, for each answer.",
        matchingOptions: ["A. Westley Baths", "B. The Hawker Harriers", "C. Keep Fit!!", "D. Westley Hiking Club", "E. Westley Bridge Club"],
        questions: [
          { text: "1. This leisure activity does not have a regular meeting place." },
          { text: "2. You need to possess some equipment to do this leisure activity." },
          { text: "3. This leisure activity can offer different prices for people who don't have a job." },
          { text: "4. This leisure activity location gives people the chance to watch the sport going on." },
          { text: "5. This leisure activity takes place only in the evenings." },
          { text: "6. Other participants of this leisure activity organise to meet each other outside its regular meeting times." },
        ],
      },
      {
        questionType: "matching",
        instructions:
          "Questions 7-13. The Week 1 July Programme for the Westley Arts Centre has information in sections A-F. Which section contains the information found in each statement? Write the correct letter, A-F.",
        matchingOptions: [
          "A. Film Club",
          "B. The Sunrise Rock Group's Sophie Alexander",
          "C. Concert by the Westley Youth Orchestra",
          "D. Poetry",
          "E. Dinner Dance",
          "F. Special Exhibition",
        ],
        questions: [
          { text: "7. You will hear young people play at this event." },
          { text: "8. This event will be held outdoors." },
          { text: "9. This event features only one performer." },
          { text: "10. At this event you can meet the performers." },
          { text: "11. This event will feature a foreign language." },
          { text: "12. It is advised that you buy a ticket in advance for this event." },
          { text: "13. This is the cheapest event." },
        ],
      },
    ],
  },
  {
    ieltsType: "General",
    passage:
      `Section 2 - Questions 14-26

Leaflet: Staines University, Ontario - Campuses

Staines University has several campuses across Toronto. Ranging in style from modern centres to buildings which have been standing for many years, our campuses include traditional college buildings, purpose-built sites and sport and leisure facilities. Halls of residence are located on campuses or conveniently close by. The predominantly urban surroundings of the University means there is also a good choice of local, private rented accommodation.

Cat Hill*
The Cat Hill campus is home to all our departments related to art, design, architecture and town planning. Underpinned by innovative teaching, research, computer graphics and an extensive range of specialist facilities, Cat Hill continues to shape developments in its areas of interest. The University's new Museum of Domestic Design and Architecture is also based here. Offering a wealth of exciting archive and student material, it houses one of the most important collections of innovative design from the nineteenth, twentieth and now twenty-first centuries.

Eastfield*
The Eastfield campus has been a centre for education and learning in various disciplines since 1901. Today, some of the University's most modern facilities share space with period buildings on this compact site. The breadth of academic opportunities reflects the diversity of both contemporary social science and the modern health sciences - it is very much a place for people who want to tackle contemporary headline problems.

Headley Grange*
The whole Headley Grange campus is being transformed in a significant three-year building plan that will be completed in a further 2 years when the University's Computing School moves to the campus to join the Business School. Staines University Business School at Headley Grange is one of Toronto's largest centres for business and professional education. With a range of international partners, it attracts many students from different parts of the world.

Our Kentham campus closes next summer. From the next academic year all Kentham programmes will be offered at Headley Grange and Trenton Park. All Computing Science programmes are moving to Headley Grange. All Humanities, Modern Languages and Translation and Media Studies are moving to Trenton Park.

Trenton Park*
Trenton Park is an impressive 60-acre country campus surrounded by 900 acres of woodland and meadows. A recognised centre of excellence across several academic disciplines, this campus is one of the largest university centres for dance and drama in Canada and one of Toronto's major providers of teacher education. Recently the University has established its new centre for product design and engineering on the campus.

* denotes halls of residence on campus

Article: Choosing a Secondary School for Your Child

No doubt one of the most difficult decisions you will make regarding your child's education will be choosing a secondary school. To make this choice easier, the most important thing to do before choosing is to do your research and find as much relevant information as possible.

One way to gain first-hand knowledge of where your child may have most success at school is by visiting in person. You can learn a lot by observing the children, the teachers and the way the school is run. Schools hold open evenings and appointments, and all schools include this information in their prospectus. You can attend regular open events. This allows you to get your own feel for whether this is the right school for your child.

Each school has Parent Teacher Associations (PTAs). These associations may give useful extra information about the school and offer advice on admissions. Your Local Education Authority (LEA) can also provide information about schools, including how many pupils they admit, admission arrangements and special opportunities.

Another source of information is each school's prospectus. The prospectus usually tells you more about a particular school than any other source and can often be requested directly from the school. It is important to receive the prospectuses from all schools you might be interested in. Every year the Department for Education and Skills (DfES) publishes performance tables showing how well schools are doing.

It is also helpful to read the Ofsted reports for schools. A report is available for every school and can either be produced by writing to the Ofsted office or from online sources. To obtain a report about a particular school, performance tables and individual school websites, go to the Ofsted and DfES websites.

There have also been important changes in the school application process. Instead of schools allocating places directly, schools now submit offers to the Local Education Authority. Under newer government legislation all schools and LEAs notify parents on the same day. Parents can then submit applications by the stated deadline to the correct address, and may be asked to provide additional information to support the application.`,
    questionGroups: [
      {
        questionType: "short_answer",
        instructions:
          "Questions 14-17. On the following page is a leaflet containing information about several campuses of Staines University. Answer the questions by writing the appropriate name of a campus.",
        questions: [
          { text: "14. At which campus can you do a teaching course next year?" },
          { text: "15. At which campus can you study French next year?" },
          { text: "16. At which campus can you see student work in exhibitions?" },
          { text: "17. At which campus can you study a course connected to current affairs?" },
        ],
      },
      {
        questionType: "true_false_not_given",
        instructions:
          "Questions 18-20. Read the leaflet containing information about several campuses of Staines University again and look at the statements below. Write TRUE if the statement is true, FALSE if the statement is false, NOT GIVEN if the information is not given in the leaflet.",
        questions: [
          { text: "18. Headley Grange is currently comprised of only the business school." },
          { text: "19. Most of the university buildings are in a town setting." },
          { text: "20. All campuses next year will have on campus accommodation available." },
        ],
      },
      {
        questionType: "summary_completion",
        instructions:
          "Questions 21-23. Read the article Choosing a Secondary School for Your Child. Below is a list of 3 ways mentioned in the article that you can find out about schools. Which THREE ways in the article are missing from this list? Write NO MORE THAN THREE WORDS for each answer.",
        questions: [
          { text: "21. Finding information about schools: ______" },
          { text: "22. Finding information about schools: ______" },
          { text: "23. Finding information about schools: ______" },
        ],
      },
      {
        questionType: "true_false_not_given",
        instructions:
          "Questions 24-26. Read the article Choosing a Secondary School for Your Child again and look at the statements below. Write TRUE if the statement is true, FALSE if the statement is false, NOT GIVEN if the information is not given in the article.",
        questions: [
          { text: "24. New government rules ensure that parents hear about the result of their child's school application sooner than before." },
          { text: "25. You must make an appointment to attend any school visits." },
          { text: "26. Parents may be required to supply further documents with their child's application." },
        ],
      },
    ],
  },
  {
    ieltsType: "General",
    passage:
      `Section 3 - Why Africa Continues To Go Hungry

A. Over the last twenty or thirty years all of us have seen famine pictures from Africa. We know people there are starving and many organisations have responded generously whenever there has been a crisis. We also know that after one-off relief operations, everything tends to return to famine when the rains fail again.

B. The truth is that millions of Africans, from Mauritania across to Somalia, face starvation. And this has happened despite drought not being the major underlying cause in every case. Kenya, one of the more wealthy African nations, has had severe hunger in parts of the country. Experts estimate many southern regions have high agricultural potential, and even if less than a quarter of Kenya's land is high to moderate agricultural potential, there is still enough good farmland to meet food needs.

C. One reason is the increase in cash-cropping. Large areas are devoted to crops such as tea, coffee and pyrethrum because they provide regular cash income. But dependence on export crops exposes farmers to world prices. Smallholders can then lose out: if world prices collapse, a bad harvest can be catastrophic.

D. During the last decade, according to the World Bank, prices for many commodities fell. Countries such as Uganda and Kenya were told to specialise in a small range of export crops while richer countries maintained barriers and subsidies. If global prices fall, poor producers struggle while buyers and consumers in richer countries benefit.

E. Population pressure in Kenya means that shamba land is being split into smaller and smaller units. Hillsides have been cleared for crops and wood fuel. This accelerates ecological damage and leaves families with less secure food production.

F. Deforestation causes soil erosion. Where maize is planted on steep slopes without terraces, topsoil is washed away, reducing moisture retention and long-term productivity. Less forest also means less rainfall and a greater risk of drought and desertification.

G. The wider problem is tied to short-sighted development choices. Governments often pursue growth and wealth creation while neglecting the principle that people must be fed first before agricultural surplus can be safely prioritised.`,
    questionGroups: [
      {
        questionType: "matching_headings",
        instructions:
          "Questions 27-32. The reading passage has seven paragraphs, A-G. From the list of headings below choose the most suitable heading for paragraphs B-G. There are more headings than paragraphs, so you will not use all of them.",
        matchingOptions: [
          "i. A False Start",
          "ii. Kenya's Search for New Farmland",
          "iii. Poverty Leads to War",
          "iv. The Rich Get Richer",
          "v. The Wrong Choice",
          "vi. We Are Not All to Blame",
          "vii. Serious Consequences",
          "viii. Birth Control, the Answer?",
          "ix. From Land to Cash Cropping",
          "x. Alternatives to Colonial Exploitation",
          "xi. Famine Not Hungry",
        ],
        questions: [
          { text: "27. Paragraph B" },
          { text: "28. Paragraph C" },
          { text: "29. Paragraph D" },
          { text: "30. Paragraph E" },
          { text: "31. Paragraph F" },
          { text: "32. Paragraph G" },
        ],
      },
      {
        questionType: "true_false_not_given",
        instructions:
          "Questions 33-40. Do the following statements agree with the information given in Reading Passage 3? Write TRUE if the statement agrees with the information, FALSE if the statement does not agree with the information, NOT GIVEN if there is no information on this.",
        questions: [
          { text: "33. Recently surveys have been conducted to find out the causes of African starvation." },
          { text: "34. The 20% of Kenyan land that is good for farming has the potential to produce enough food for the country's inhabitants." },
          { text: "35. Cash cropping became really popular in Kenya in the mid 20th century." },
          { text: "36. Half of the Kenyan population work in agriculture." },
          { text: "37. The origins of cash cropping come from western colonialism." },
          { text: "38. Lack of terracing in Kenyan hill farms has led to rain destroying the hills' agricultural potential." },
          { text: "39. The program for cutting down trees in Africa can eventually lead to the formation of deserts." },
          { text: "40. The writer blames the problem wholly on the governments of African countries." },
        ],
      },
    ],
  },
];
