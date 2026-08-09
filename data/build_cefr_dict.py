import json
import os

cefr_data = {
    "A1": [
        {"word": "APPLE", "meaning": "A round red or green edible fruit"},
        {"word": "BOOK", "meaning": "A written or printed work consisting of pages"},
        {"word": "CAT", "meaning": "A small domesticated carnivorous mammal"},
        {"word": "DOG", "meaning": "A domesticated carnivorous mammal with a bark"},
        {"word": "FISH", "meaning": "A limbless cold-blooded vertebrate animal with gills"},
        {"word": "GAME", "meaning": "An activity one engages in for amusement or fun"},
        {"word": "HOUSE", "meaning": "A building for human habitation"},
        {"word": "LOVE", "meaning": "An intense feeling of deep affection"},
        {"word": "MILK", "meaning": "A white liquid produced by mammals"},
        {"word": "NAME", "meaning": "A word or set of words by which a person or thing is known"},
        {"word": "OPEN", "meaning": "Unclosed or unsealed"},
        {"word": "PARK", "meaning": "A large public green area in a town"},
        {"word": "READ", "meaning": "Look at and comprehend the meaning of written matter"},
        {"word": "STAR", "meaning": "A luminous point in the night sky"},
        {"word": "TIME", "meaning": "The indefinite continued progress of existence"},
        {"word": "WATER", "meaning": "A transparent odorless liquid forming seas and rain"},
        {"word": "BIRD", "meaning": "A warm-blooded egg-laying vertebrate with feathers"},
        {"word": "CITY", "meaning": "A large human settlement or town"},
        {"word": "DOOR", "meaning": "A hinged or sliding barrier at an entrance"},
        {"word": "FIRE", "meaning": "Combustion producing light, heat, and flame"},
        {"word": "FOOD", "meaning": "Any nutritious substance consumed to maintain life"},
        {"word": "GIRL", "meaning": "A female child or young woman"},
        {"word": "HEAD", "meaning": "The upper part of the human body containing the brain"},
        {"word": "KING", "meaning": "The male ruler of an independent state"},
        {"word": "LIFE", "meaning": "The condition that distinguishes animals and plants from inorganic matter"},
        {"word": "MOON", "meaning": "The natural satellite of the Earth"},
        {"word": "RAIN", "meaning": "Condensed moisture of the atmosphere falling in drops"},
        {"word": "SONG", "meaning": "A short poem or set of words set to music"},
        {"word": "TREE", "meaning": "A woody perennial plant with a trunk and branches"},
        {"word": "WIND", "meaning": "Perceptible natural movement of air"}
    ],
    "A2": [
        {"word": "ACTION", "meaning": "The process of doing something to achieve an aim"},
        {"word": "CAMERA", "meaning": "A device for recording visual images"},
        {"word": "DANGER", "meaning": "The possibility of suffering harm or injury"},
        {"word": "ENERGY", "meaning": "The strength and vitality required for sustained activity"},
        {"word": "FUTURE", "meaning": "The time or a period of time following the moment of speaking"},
        {"word": "GARDEN", "meaning": "A piece of ground adjoining a house used for growing flowers or vegetables"},
        {"word": "HEALTH", "meaning": "The state of being free from illness or injury"},
        {"word": "ISLAND", "meaning": "A piece of land surrounded by water"},
        {"word": "JOURNEY", "meaning": "An act of traveling from one place to another"},
        {"word": "MARKET", "meaning": "A regular gathering for the purchase and sale of provisions"},
        {"word": "NATURE", "meaning": "The phenomena of the physical world collectively"},
        {"word": "PLANET", "meaning": "A celestial body moving in an elliptical orbit round a star"},
        {"word": "RIVER", "meaning": "A large natural stream of water flowing in a channel"},
        {"word": "SILVER", "meaning": "A precious shiny grayish-white metal"},
        {"word": "TRAVEL", "meaning": "Make a journey, typically of some length"},
        {"word": "WINTER", "meaning": "The coldest season of the year"},
        {"word": "ANIMAL", "meaning": "A living organism that feeds on organic matter"},
        {"word": "BRIDGE", "meaning": "A structure carrying a road across an obstacle"},
        {"word": "CANDLE", "meaning": "A cylinder of wax with a central wick"},
        {"word": "DOCTOR", "meaning": "A qualified practitioner of medicine"}
    ],
    "B1": [
        {"word": "ACHIEVE", "meaning": "Successfully bring about or reach by effort or skill"},
        {"word": "BALANCE", "meaning": "An even distribution of weight enabling someone to remain upright"},
        {"word": "COMPLEX", "meaning": "Consisting of many different and connected parts"},
        {"word": "DISCUSS", "meaning": "Talk about something with another person or group"},
        {"word": "EXPLORE", "meaning": "Travel through an unfamiliar area to learn about it"},
        {"word": "FREEDOM", "meaning": "The power or right to act, speak, or think as one wants"},
        {"word": "GRAVITY", "meaning": "The force that attracts a body toward the center of the earth"},
        {"word": "IMAGINE", "meaning": "Form a mental image or concept of"},
        {"word": "JUSTICE", "meaning": "Just behavior or treatment; fairness"},
        {"word": "KINGDOM", "meaning": "A country, state, or territory ruled by a king or queen"},
        {"word": "MYSTERY", "meaning": "Something that is difficult or impossible to understand"},
        {"word": "ORGANIC", "meaning": "Relating to or derived from living matter"},
        {"word": "PROTECT", "meaning": "Keep safe from harm or injury"},
        {"word": "QUALITY", "meaning": "The standard of something as measured against other things"},
        {"word": "SCIENCE", "meaning": "Systematic study of the structure and behavior of the physical world"}
    ],
    "B2": [
        {"word": "ABANDON", "meaning": "Cease to support or look after; desert"},
        {"word": "BOUNDARY", "meaning": "A line that marks the limits of an area"},
        {"word": "DILIGENT", "meaning": "Having or showing care and conscientiousness in work"},
        {"word": "EMBRACE", "meaning": "Hold someone closely as a sign of affection or welcome"},
        {"word": "FLOURISH", "meaning": "Grow or develop in a healthy or vigorous way"},
        {"word": "GENERATE", "meaning": "Cause something to arise or come about"},
        {"word": "HARMONY", "meaning": "The combination of simultaneously sounded musical notes to produce chords"},
        {"word": "ILLUSION", "meaning": "A false idea or belief"},
        {"word": "JUDGMENT", "meaning": "The ability to make considered decisions or come to sensible conclusions"},
        {"word": "LUMINOUS", "meaning": "Full of or shedding light; bright or shining"}
    ],
    "C1": [
        {"word": "ADVOCATE", "meaning": "A person who publicly supports or recommends a particular cause"},
        {"word": "BENCHMARK", "meaning": "A standard or point of reference against which things may be compared"},
        {"word": "COGNITIVE", "meaning": "Relating to cognition; intellectual activity"},
        {"word": "DILEMMA", "meaning": "A situation in which a difficult choice has to be made between two alternatives"},
        {"word": "ELOQUENT", "meaning": "Fluent or persuasive in speaking or writing"},
        {"word": "GUARDIAN", "meaning": "A defender, protector, or keeper"},
        {"word": "INTRICATE", "meaning": "Very complicated or detailed"},
        {"word": "METAPHOR", "meaning": "A figure of speech in which a word or phrase is applied to an object"},
        {"word": "PARADIGM", "meaning": "A typical example or pattern of something; a model"},
        {"word": "SYNERGY", "meaning": "The interaction of elements that when combined produce a total effect that is greater than the sum"}
    ],
    "C2": [
        {"word": "ABERRATION", "meaning": "A departure from what is normal, usual, or expected"},
        {"word": "BENEVOLENT", "meaning": "Well meaning and kindly"},
        {"word": "CACOPHONY", "meaning": "A harsh, discordant mixture of sounds"},
        {"word": "EPHEMERAL", "meaning": "Lasting for a very short time"},
        {"word": "EQUANIMITY", "meaning": "Mental calmness, composure, and evenness of temper"},
        {"word": "JUXTAPOSITION", "meaning": "The fact of two things being seen or placed close together with contrasting effect"},
        {"word": "MAGNANIMOUS", "meaning": "Generous or forgiving, especially toward a rival"},
        {"word": "QUINTESSENCE", "meaning": "The most perfect or typical example of a quality or class"},
        {"word": "RESILIENT", "meaning": "Able to withstand or recover quickly from difficult conditions"},
        {"word": "UBIQUITOUS", "meaning": "Present, appearing, or found everywhere"}
    ]
}

os.makedirs("data", exist_ok=True)
output_path = os.path.join("data", "cefr_dictionary.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(cefr_data, f, ensure_ascii=False, indent=2)

print(f"Generated English CEFR dictionary successfully at {output_path}")
