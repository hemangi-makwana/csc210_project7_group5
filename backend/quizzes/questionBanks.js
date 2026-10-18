/**
 * ============================================================================
 * SKILL VERIFICATION QUIZ QUESTION BANKS
 * ============================================================================
 *
 * Curated, technically accurate question banks for all teachable skills
 * offered across the SkillSwap catalog and seed mentors.
 *
 * Each question has:
 * - id: Unique question identifier
 * - question: Clear, unambiguous question text
 * - options: 4 distinct choices
 * - correctAnswer: The exact matching string of the correct choice
 * - explanation: Concise explanation reinforcing why the answer is correct
 * ============================================================================
 */

const QUESTION_BANKS = {
  python: [
    {
      id: "py_1",
      question: "What is the primary difference between a Python list and a tuple?",
      options: [
        "Lists are mutable, whereas tuples are immutable.",
        "Tuples can only contain numbers, while lists can contain any data type.",
        "Lists are ordered, while tuples are unordered collections.",
        "Tuples support item assignment, while lists do not.",
      ],
      correctAnswer: "Lists are mutable, whereas tuples are immutable.",
      explanation: "In Python, lists can be modified after creation (mutable), whereas tuples cannot have elements added, removed, or changed once created (immutable).",
    },
    {
      id: "py_2",
      question: "Which built-in function returns an iterator of tuples containing the index and item from an iterable?",
      options: ["enumerate()", "zip()", "map()", "range()"],
      correctAnswer: "enumerate()",
      explanation: "enumerate(iterable, start=0) yields pairs of (index, item) for each element in the given iterable.",
    },
    {
      id: "py_3",
      question: "In Python, what does the Global Interpreter Lock (GIL) primarily do?",
      options: [
        "It prevents multiple native OS threads from executing Python bytecodes concurrently in CPython.",
        "It locks files against concurrent reading by different processes.",
        "It accelerates garbage collection across all imported modules.",
        "It prevents unauthorized network requests in standard libraries.",
      ],
      correctAnswer: "It prevents multiple native OS threads from executing Python bytecodes concurrently in CPython.",
      explanation: "CPython's GIL is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecode simultaneously.",
    },
    {
      id: "py_4",
      question: "What will `[x**2 for x in range(5) if x % 2 == 0]` evaluate to?",
      options: ["[0, 4, 16]", "[0, 1, 4, 9, 16]", "[4, 16]", "[0, 2, 4]"],
      correctAnswer: "[0, 4, 16]",
      explanation: "range(5) produces 0, 1, 2, 3, 4. The even numbers are 0, 2, and 4. Squaring each yields [0, 4, 16].",
    },
    {
      id: "py_5",
      question: "How does Python handle memory management and unused objects?",
      options: [
        "Using reference counting augmented by a cyclic garbage collector.",
        "Strictly using manual deallocation with free() calls.",
        "By terminating threads whenever heap memory reaches 90%.",
        "By converting all unused variables to None automatically at function exit.",
      ],
      correctAnswer: "Using reference counting augmented by a cyclic garbage collector.",
      explanation: "CPython's primary memory management is reference counting. When a count drops to zero, memory is freed immediately. A generational cyclic GC handles reference cycles.",
    },
    {
      id: "py_6",
      question: "What keyword is used to create a generator function in Python?",
      options: ["yield", "generate", "return from", "async"],
      correctAnswer: "yield",
      explanation: "Using the `yield` statement inside a function turns it into a generator function, which returns a lazy generator iterator.",
    },
    {
      id: "py_7",
      question: "What is the output of `bool([])`, `bool({})`, and `bool('False')` in Python?",
      options: [
        "False, False, True",
        "False, False, False",
        "True, True, True",
        "False, True, False",
      ],
      correctAnswer: "False, False, True",
      explanation: "Empty collections (`[]`, `{}`) are falsy. Any non-empty string, including `'False'`, is truthy in Python.",
    },
    {
      id: "py_8",
      question: "In object-oriented Python, what does the `super()` function do?",
      options: [
        "It returns a proxy object that delegates method calls to a parent or sibling class.",
        "It makes a class method private and inaccessible from outside.",
        "It creates a static singleton instance of the class.",
        "It overrides all methods in the subclass with default implementations.",
      ],
      correctAnswer: "It returns a proxy object that delegates method calls to a parent or sibling class.",
      explanation: "`super()` returns a proxy object allowing calls to methods of the superclass according to the Method Resolution Order (MRO).",
    },
    {
      id: "py_9",
      question: "What is the time complexity of looking up a key in a standard Python dictionary in the average case?",
      options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
      correctAnswer: "O(1)",
      explanation: "Python dictionaries are implemented as hash tables, providing O(1) average-time complexity for key lookups, insertions, and deletions.",
    },
    {
      id: "py_10",
      question: "Which of the following creates a shallow copy of a list named `original` in Python 3?",
      options: [
        "original.copy() or original[:]",
        "original.deepcopy()",
        "copy(original, deep=True)",
        "original.clone()",
      ],
      correctAnswer: "original.copy() or original[:]",
      explanation: "Both `original.copy()` and the slice notation `original[:]` produce a shallow copy of a list in Python.",
    },
    {
      id: "py_11",
      question: "What is the purpose of the `*args` and `**kwargs` parameters in Python functions?",
      options: [
        "`*args` passes variable-length positional arguments; `**kwargs` passes keyword arguments.",
        "`*args` multiplies numbers; `**kwargs` calculates power values.",
        "`*args` is for pointers; `**kwargs` is for references.",
        "`*args` is only allowed in class constructors; `**kwargs` in class methods.",
      ],
      correctAnswer: "`*args` passes variable-length positional arguments; `**kwargs` passes keyword arguments.",
      explanation: "`*args` collects extra positional arguments into a tuple, while `**kwargs` collects extra keyword arguments into a dictionary.",
    },
    {
      id: "py_12",
      question: "What is the correct syntax to open a file safely and ensure it closes automatically?",
      options: [
        "with open('file.txt', 'r') as f:",
        "open('file.txt').autoclose()",
        "try: open('file.txt') finally: pass",
        "using open('file.txt') as f:",
      ],
      correctAnswer: "with open('file.txt', 'r') as f:",
      explanation: "The `with` statement utilizes the context manager protocol to guarantee the file is closed upon leaving the block, even if exceptions occur.",
    },
  ],

  "web design": [
    {
      id: "wd_1",
      question: "Which CSS property defines the space between the content of an element and its border?",
      options: ["padding", "margin", "outline", "gap"],
      correctAnswer: "padding",
      explanation: "In the CSS box model, padding is the inner spacing between the element's content and its border.",
    },
    {
      id: "wd_2",
      question: "What does `box-sizing: border-box` do in CSS?",
      options: [
        "It includes padding and border in the element's total width and height.",
        "It excludes padding from the total dimensions.",
        "It adds a 3D drop shadow around the border.",
        "It forces all child elements to display in a single row.",
      ],
      correctAnswer: "It includes padding and border in the element's total width and height.",
      explanation: "`border-box` ensures that width and height specify the full rendered box dimension inclusive of content, padding, and border.",
    },
    {
      id: "wd_3",
      question: "In CSS Flexbox, which property aligns items along the cross axis?",
      options: ["align-items", "justify-content", "flex-direction", "align-content"],
      correctAnswer: "align-items",
      explanation: "While `justify-content` aligns items along the main axis, `align-items` aligns flex items along the cross axis.",
    },
    {
      id: "wd_4",
      question: "What is the relative unit `rem` based on in CSS?",
      options: [
        "The font size of the root element (<html>).",
        "The font size of the immediate parent element.",
        "The width of the viewport divided by 100.",
        "The height of the active container.",
      ],
      correctAnswer: "The font size of the root element (<html>).",
      explanation: "`rem` stands for 'root em' and is calculated relative to the font-size of the root element (typically 16px by default).",
    },
    {
      id: "wd_5",
      question: "Which HTML5 element represents self-contained content that could be independently distributed or syndicated?",
      options: ["<article>", "<section>", "<div>", "<aside>"],
      correctAnswer: "<article>",
      explanation: "The `<article>` tag is intended for standalone, independently distributable content like a blog post, news story, or forum thread.",
    },
    {
      id: "wd_6",
      question: "According to WCAG 2.1 Level AA, what is the minimum contrast ratio required for normal body text against its background?",
      options: ["4.5:1", "3:1", "7:1", "2:1"],
      correctAnswer: "4.5:1",
      explanation: "WCAG 2.1 AA mandates a minimum contrast ratio of 4.5:1 for normal text (and 3:1 for large text $\\ge$ 18pt or 14pt bold).",
    },
    {
      id: "wd_7",
      question: "What does the CSS media query `@media (max-width: 768px)` target?",
      options: [
        "Devices with viewport width of 768 pixels or narrower.",
        "Devices with viewport width of 768 pixels or wider.",
        "Only devices with a screen height of 768px.",
        "Print media with resolution up to 768 DPI.",
      ],
      correctAnswer: "Devices with viewport width of 768 pixels or narrower.",
      explanation: "`max-width: 768px` applies CSS rules when the viewport width is less than or equal to 768px, commonly used for mobile and tablet breakpoints.",
    },
    {
      id: "wd_8",
      question: "Which CSS Grid property creates responsive columns that wrap automatically without media queries?",
      options: [
        "grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))",
        "grid-auto-flow: wrap-reverse",
        "grid-columns: flex-wrap",
        "grid-template-rows: auto-responsive",
      ],
      correctAnswer: "grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))",
      explanation: "`repeat(auto-fit, minmax(min, 1fr))` dynamically creates as many columns as will fit the container and stretches them across remaining space.",
    },
    {
      id: "wd_9",
      question: "How does CSS specificity calculate which selector overrides conflicting rules?",
      options: [
        "Inline styles > ID selectors > Class/Attribute/Pseudo-classes > Type/Pseudo-elements",
        "Type selectors > Class selectors > ID selectors > Inline styles",
        "The selector with the shortest character length always wins.",
        "The newest CSS property declared in the browser cache always wins.",
      ],
      correctAnswer: "Inline styles > ID selectors > Class/Attribute/Pseudo-classes > Type/Pseudo-elements",
      explanation: "Specificity follows a hierarchy: Inline styles (1,0,0,0) > IDs (0,1,0,0) > Classes/Attributes/Pseudo-classes (0,0,1,0) > Elements/Pseudo-elements (0,0,0,1).",
    },
    {
      id: "wd_10",
      question: "What is the primary accessibility purpose of the `alt` attribute on an `<img>` tag?",
      options: [
        "It provides a text alternative for screen readers and when images fail to load.",
        "It defines the tooltip hover animation speed.",
        "It sets the image aspect ratio in high-DPI displays.",
        "It specifies the fallback server URL for image CDN mirrors.",
      ],
      correctAnswer: "It provides a text alternative for screen readers and when images fail to load.",
      explanation: "Screen readers read the `alt` text to visually impaired users, and browsers render it if the image source fails to load.",
    },
    {
      id: "wd_11",
      question: "Which CSS property specifies whether an element creates a new stacking context for `z-index`?",
      options: [
        "position: relative/absolute/fixed with a non-static z-index, or opacity < 1",
        "display: block",
        "margin: auto",
        "text-align: center",
      ],
      correctAnswer: "position: relative/absolute/fixed with a non-static z-index, or opacity < 1",
      explanation: "A new stacking context is formed by positioned elements with z-index other than auto, elements with opacity < 1, transform, filter, etc.",
    },
    {
      id: "wd_12",
      question: "What is the key benefit of responsive SVG over PNG for web design logos and icons?",
      options: [
        "Vector-based scalability to any resolution without loss of clarity or file bloat.",
        "Automatic conversion to WebGL 3D meshes.",
        "Built-in DRM encryption preventing downloading.",
        "Support for raster pixel shaders at 120 FPS.",
      ],
      correctAnswer: "Vector-based scalability to any resolution without loss of clarity or file bloat.",
      explanation: "SVGs are XML vector graphics that render crisp at any display density (1x, 2x, Retina) with very small file sizes.",
    },
  ],

  guitar: [
    {
      id: "gt_1",
      question: "What is standard tuning for a 6-string guitar from lowest pitch to highest pitch?",
      options: ["E - A - D - G - B - E", "D - A - D - G - B - E", "E - B - G - D - A - E", "C - G - C - F - A - D"],
      correctAnswer: "E - A - D - G - B - E",
      explanation: "Standard tuning from string 6 (thickest / lowest) to string 1 (thinnest / highest) is E2 - A2 - D3 - G3 - B3 - E4.",
    },
    {
      id: "gt_2",
      question: "What is a barre chord on guitar?",
      options: [
        "A chord where one finger presses down multiple strings across a single fret.",
        "A chord played exclusively on the bass strings using the thumb.",
        "A chord that requires loosening the tuning pegs during playback.",
        "A chord played without pressing any frets.",
      ],
      correctAnswer: "A chord where one finger presses down multiple strings across a single fret.",
      explanation: "A barre (or bar) chord uses the index finger across multiple or all strings at a given fret, acting like a movable nut or capo.",
    },
    {
      id: "gt_3",
      question: "What does placing a capo on the 2nd fret do to the open strings?",
      options: [
        "Raises the pitch of all open strings by one whole step (2 semitones).",
        "Lowers the pitch of all open strings by one semitone.",
        "Mutes all open strings to create percussive clicking.",
        "Changes standard tuning into drop-D tuning.",
      ],
      correctAnswer: "Raises the pitch of all open strings by one whole step (2 semitones).",
      explanation: "Each fret represents one semitone (half step). Placing a capo on the 2nd fret raises the open pitch by two semitones (one whole step).",
    },
    {
      id: "gt_4",
      question: "How many notes are in a standard pentatonic scale?",
      options: ["5 notes per octave", "7 notes per octave", "8 notes per octave", "12 notes per octave"],
      correctAnswer: "5 notes per octave",
      explanation: "'Penta' means five. A pentatonic scale contains 5 notes per octave (unlike a 7-note diatonic major/minor scale).",
    },
    {
      id: "gt_5",
      question: "Which chords make up the classic I - IV - V progression in the key of G Major?",
      options: ["G - C - D", "G - Am - Em", "G - Bm - C", "G - D - Em"],
      correctAnswer: "G - C - D",
      explanation: "In G Major: I is G Major, IV is C Major, and V is D Major. This is one of the most foundational chord progressions in music.",
    },
    {
      id: "gt_6",
      question: "What is the interval between the open G string (3rd string) and open B string (2nd string) on a standard guitar?",
      options: ["Major third (4 semitones)", "Perfect fourth (5 semitones)", "Perfect fifth (7 semitones)", "Minor second (1 semitone)"],
      correctAnswer: "Major third (4 semitones)",
      explanation: "While all other adjacent pairs of strings are tuned in perfect fourths (5 semitones), G to B is tuned in a major third (4 semitones).",
    },
    {
      id: "gt_7",
      question: "What is 'intonation' on a guitar?",
      options: [
        "The accuracy of pitch across different frets along the entire fretboard.",
        "The maximum volume output of the pickup magnet.",
        "The decorative wood inlay around the soundhole.",
        "The brand and gauge thickness of guitar strings.",
      ],
      correctAnswer: "The accuracy of pitch across different frets along the entire fretboard.",
      explanation: "Proper intonation ensures that fretted notes remain in tune with open strings all the way up the neck, especially at the 12th fret octave.",
    },
    {
      id: "gt_8",
      question: "What frets usually mark the natural harmonic octave points on a guitar?",
      options: ["12th fret, 7th fret, and 5th fret", "1st fret and 3rd fret", "9th fret and 11th fret", "Only the 21st fret"],
      correctAnswer: "12th fret, 7th fret, and 5th fret",
      explanation: "Natural harmonics occur at nodal points dividing string length: 12th fret (1/2 string = octave), 7th fret (1/3 string), 5th fret (1/4 string).",
    },
    {
      id: "gt_9",
      question: "What is palm muting on the guitar?",
      options: [
        "Lightly resting the side of the picking hand on strings near the bridge to dampen sustain and produce a punchy sound.",
        "Pressing the palm firmly onto the fretboard to silence all notes completely.",
        "Using open hands to tap on the guitar body like a bongo drum.",
        "Holding the pick between the palm and pinky finger.",
      ],
      correctAnswer: "Lightly resting the side of the picking hand on strings near the bridge to dampen sustain and produce a punchy sound.",
      explanation: "Palm muting rests the fleshy edge of the picking hand near the bridge saddles, dampening the string vibration for a percussive, chunky tone.",
    },
    {
      id: "gt_10",
      question: "What distinguishes an acoustic guitar from a classical guitar?",
      options: [
        "Classical guitars use nylon strings and have a wider, flat fingerboard; acoustic guitars typically use steel strings.",
        "Classical guitars always have electric magnetic pickups built in.",
        "Acoustic guitars have only 4 strings; classical guitars have 6.",
        "There is no difference; they are identical instruments.",
      ],
      correctAnswer: "Classical guitars use nylon strings and have a wider, flat fingerboard; acoustic guitars typically use steel strings.",
      explanation: "Classical guitars use nylon strings with a slotted headstock and wider flat neck. Steel-string acoustics use steel strings with higher tension and narrow radiused necks.",
    },
    {
      id: "gt_11",
      question: "What is alternate picking technique?",
      options: [
        "Alternating strictly between downstrokes and upstrokes with the pick.",
        "Using a pick and fingers alternately on every measure.",
        "Switching between two different plastic picks during a solo.",
        "Picking only using downstrokes at double tempo.",
      ],
      correctAnswer: "Alternating strictly between downstrokes and upstrokes with the pick.",
      explanation: "Alternate picking alternates continuous downstrokes ($\\downarrow$) and upstrokes ($\\uparrow$), providing speed, efficiency, and rhythmic timing.",
    },
    {
      id: "gt_12",
      question: "What is the relative minor key to C Major?",
      options: ["A minor", "E minor", "D minor", "G minor"],
      correctAnswer: "A minor",
      explanation: "The relative minor shares the exact same key signature as its relative major and starts on the 6th degree (in C major: C-D-E-F-G-A $\\rightarrow$ A minor).",
    },
  ],

  "public speaking": [
    {
      id: "ps_1",
      question: "What are the three classical modes of persuasion identified by Aristotle in rhetoric?",
      options: [
        "Ethos (credibility), Pathos (emotion), and Logos (logic)",
        "Volume, Pitch, and Speed",
        "Introduction, Body, and Conclusion",
        "Delivery, Memorization, and Pronunciation",
      ],
      correctAnswer: "Ethos (credibility), Pathos (emotion), and Logos (logic)",
      explanation: "Aristotle's rhetorical triangle comprises Ethos (appealing to authority/character), Pathos (emotional resonance), and Logos (reasoning and evidence).",
    },
    {
      id: "ps_2",
      question: "What is the recommended approach to utilizing pauses during an oral presentation?",
      options: [
        "Pausing intentionally before or after key points to emphasize importance and let concepts sink in.",
        "Never pausing, because silence indicates lack of preparation.",
        "Filling all silences with vocal fillers like 'um', 'uh', and 'you know'.",
        "Pausing only when looking directly at slide notes.",
      ],
      correctAnswer: "Pausing intentionally before or after key points to emphasize importance and let concepts sink in.",
      explanation: "Strategic silence is a powerful public speaking tool: it captures attention, frames crucial ideas, and replaces filler words.",
    },
    {
      id: "ps_3",
      question: "What is the primary function of a speech's 'hook' in the introduction?",
      options: [
        "To immediately seize the audience's attention and spark curiosity about the topic.",
        "To recite the speaker's entire resume and educational background.",
        "To distribute printed feedback forms to attendees.",
        "To apologize for any nervousness or slide formatting errors.",
      ],
      correctAnswer: "To immediately seize the audience's attention and spark curiosity about the topic.",
      explanation: "An effective hook (story, provocative question, surprising stat) immediately engages listeners and establishes relevance in the opening 30 seconds.",
    },
    {
      id: "ps_4",
      question: "How should a speaker maintain effective eye contact with a medium-to-large audience?",
      options: [
        "Holding eye contact with individual audience members for 3-5 seconds across different sections of the room.",
        "Staring steadily at the back wall or clock above the audience's heads.",
        "Rapidly scanning your eyes back and forth like a lighthouse beam.",
        "Looking exclusively at your presentation slides on the projector screen.",
      ],
      correctAnswer: "Holding eye contact with individual audience members for 3-5 seconds across different sections of the room.",
      explanation: "Meaningful 3-5 second eye contact establishes authentic connection, builds trust, and helps the speaker gauge audience comprehension.",
    },
    {
      id: "ps_5",
      question: "What is vocal variety and why is it important in presentations?",
      options: [
        "Varying pitch, volume, pace, and tone to keep the audience engaged and emphasize meaning.",
        "Speaking in a flat monotone to convey seriousness.",
        "Speaking at the fastest possible words-per-minute rate.",
        "Whispering the entire speech to force listeners to lean in.",
      ],
      correctAnswer: "Varying pitch, volume, pace, and tone to keep the audience engaged and emphasize meaning.",
      explanation: "Vocal variety modulates tempo, dynamics, and inflections to prevent listener fatigue and bring emotional texture to the narrative.",
    },
    {
      id: "ps_6",
      question: "When managing speech anxiety (glossophobia), which technique is empirically supported?",
      options: [
        "Slow diaphragmatic breathing and cognitive reframing of nervous arousal as excitement.",
        "Drinking 3 cups of espresso immediately before walking on stage.",
        "Memorizing every single syllable word-for-word without conceptual understanding.",
        "Avoiding eye contact with everyone in the room.",
      ],
      correctAnswer: "Slow diaphragmatic breathing and cognitive reframing of nervous arousal as excitement.",
      explanation: "Deep diaphragmatic breathing activates the parasympathetic nervous system, and reframing physiological arousal as excitement improves confidence.",
    },
    {
      id: "ps_7",
      question: "What does the 'Rule of Three' (tricolon) refer to in speechwriting?",
      options: [
        "Structuring points, ideas, or examples in triads, which makes them inherently more memorable.",
        "Limiting presentations to exactly three minutes.",
        "Rehearsing three hours for every three words.",
        "Allowing only three questions at the conclusion of a keynote.",
      ],
      correctAnswer: "Structuring points, ideas, or examples in triads, which makes them inherently more memorable.",
      explanation: "Human cognition naturally recognizes patterns in groups of three (e.g. 'Life, liberty, and the pursuit of happiness'), enhancing cadence and recall.",
    },
    {
      id: "ps_8",
      question: "What is the best way to handle an aggressive or challenging question during a Q&A session?",
      options: [
        "Acknowledge the core question calmly, restate it neutrally, address the facts, and offer to discuss further offline if needed.",
        "Argue loudly with the audience member to prove intellectual dominance.",
        "Ignore the question completely and walk off stage immediately.",
        "Pretend the audio microphone is malfunctioning.",
      ],
      correctAnswer: "Acknowledge the core question calmly, restate it neutrally, address the facts, and offer to discuss further offline if needed.",
      explanation: "Paraphrasing neutralizes hostility, maintains audience respect, keeps discussion constructive, and sets healthy boundaries.",
    },
    {
      id: "ps_9",
      question: "In speech delivery, what is 'extemporaneous speaking'?",
      options: [
        "Speaking from a structured outline or bullet points rather than reading word-for-word or reciting pure memory.",
        "Speaking completely without any prior knowledge or preparation whatsoever.",
        "Reading verbatim from a teleprompter or written script.",
        "Reciting a theatrical script from memory with scripted hand gestures.",
      ],
      correctAnswer: "Speaking from a structured outline or bullet points rather than reading word-for-word or reciting pure memory.",
      explanation: "Extemporaneous speaking is carefully planned and practiced, but delivered using speaking notes, resulting in natural, conversational engagement.",
    },
    {
      id: "ps_10",
      question: "How should presentation slides primarily be designed to support a speaker?",
      options: [
        "Minimalist visuals and key takeaways that complement the speaker rather than dense paragraphs of text.",
        "Full essays copied onto slides so the speaker can read directly from them.",
        "Bright flashing animations on every transition to keep viewers awake.",
        "Tiny 8pt fonts to fit 500 words per slide.",
      ],
      correctAnswer: "Minimalist visuals and key takeaways that complement the speaker rather than dense paragraphs of text.",
      explanation: "Slides should be visual aids that amplify the spoken word. Dense text splits audience cognitive processing, reducing retention.",
    },
    {
      id: "ps_11",
      question: "What is a 'signpost' in oral presentations?",
      options: [
        "Verbal markers (like 'First', 'Moving to our next challenge', 'In conclusion') that guide listeners through the speech's structure.",
        "Physical wooden signs held up by conference assistants.",
        "A slide that only shows corporate sponsor logos.",
        "A designated area on the podium where water is placed.",
      ],
      correctAnswer: "Verbal markers (like 'First', 'Moving to our next challenge', 'In conclusion') that guide listeners through the speech's structure.",
      explanation: "Signposts give audiences cognitive breadcrumbs to navigate speech transitions, headings, and logical shifts.",
    },
    {
      id: "ps_12",
      question: "What is the ideal way to conclude a presentation?",
      options: [
        "Summarize key takeaways and deliver a clear, memorable call to action (CTA).",
        "Mutter 'Yeah, so that's pretty much it' and stop abruptly.",
        "Introduce five brand-new complex theories in the final 30 seconds.",
        "Apologize for taking up everyone's valuable time.",
      ],
      correctAnswer: "Summarize key takeaways and deliver a clear, memorable call to action (CTA).",
      explanation: "A strong conclusion reinforces the central message and inspires the audience with a crisp, inspiring next step.",
    },
  ],

  "data structures": [
    {
      id: "ds_1",
      question: "What is the worst-case time complexity of searching for an element in an unsorted Singly Linked List of size n?",
      options: ["O(n)", "O(1)", "O(log n)", "O(n^2)"],
      correctAnswer: "O(n)",
      explanation: "In an unsorted linked list, searching requires traversing node-by-node from head to tail in the worst case, taking O(n) time.",
    },
    {
      id: "ds_2",
      question: "In a Hash Table, what is 'separate chaining'?",
      options: [
        "Resolving hash collisions by maintaining a linked list or array of all entries that hash to the same bucket index.",
        "Encrypting keys with two consecutive hash functions.",
        "Probing sequentially to the next open memory address.",
        "Splitting the table into two physically disconnected servers.",
      ],
      correctAnswer: "Resolving hash collisions by maintaining a linked list or array of all entries that hash to the same bucket index.",
      explanation: "Separate chaining handles collisions by having each bucket hold a collection (chain) of records that share that bucket's hash value.",
    },
    {
      id: "ds_3",
      question: "Which data structure operates on a Last-In, First-Out (LIFO) basis?",
      options: ["Stack", "Queue", "Heap", "Hash Table"],
      correctAnswer: "Stack",
      explanation: "A Stack pushes elements on top and pops them from the top, making the most recently added item the first to be removed (LIFO).",
    },
    {
      id: "ds_4",
      question: "What property must every node in a Binary Search Tree (BST) satisfy?",
      options: [
        "All values in the left subtree are less than the node, and all in the right subtree are greater.",
        "Every node must have exactly two child nodes.",
        "The root must always contain the maximum value in the entire tree.",
        "All leaf nodes must reside at the exact same depth.",
      ],
      correctAnswer: "All values in the left subtree are less than the node, and all in the right subtree are greater.",
      explanation: "The BST invariant requires that for any node x, keys in x.left < x.key and keys in x.right > x.key.",
    },
    {
      id: "ds_5",
      question: "What is the time complexity to find the maximum element in a valid Max-Heap of size n?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctAnswer: "O(1)",
      explanation: "In a Max-Heap, the maximum element is guaranteed to reside at the root node (index 0), allowing instantaneous O(1) peek lookup.",
    },
    {
      id: "ds_6",
      question: "What is the primary difference between a Graph and a Tree?",
      options: [
        "A Tree is a connected acyclic graph with a single root; a Graph can contain cycles and disconnected components.",
        "Graphs can only store numbers, whereas trees can store strings.",
        "Trees have undirected edges only, while graphs only have directed edges.",
        "A Tree has no hierarchy, while graphs always have parent-child rules.",
      ],
      correctAnswer: "A Tree is a connected acyclic graph with a single root; a Graph can contain cycles and disconnected components.",
      explanation: "A tree is a specialized subtype of graph: it is connected, undirected (or rooted directed), and contains zero cycles with exactly V-1 edges.",
    },
    {
      id: "ds_7",
      question: "Which traversal algorithm explores a graph level by level and finds the shortest path in an unweighted graph?",
      options: ["Breadth-First Search (BFS)", "Depth-First Search (DFS)", "In-order Traversal", "Post-order Traversal"],
      correctAnswer: "Breadth-First Search (BFS)",
      explanation: "BFS uses a FIFO queue to visit vertices in order of increasing distance from the starting source, finding shortest hop paths.",
    },
    {
      id: "ds_8",
      question: "What is the average time complexity of inserting an element into a dynamic array (like Python list or JavaScript array push)?",
      options: ["O(1) amortized", "O(n)", "O(log n)", "O(n^2)"],
      correctAnswer: "O(1) amortized",
      explanation: "Appending is O(1) most of the time. When the array capacity doubles (taking O(n)), spreading that cost across all appends yields O(1) amortized time.",
    },
    {
      id: "ds_9",
      question: "What is a circular queue?",
      options: [
        "A queue where the last position connects back to the first position to reuse deallocated memory slots.",
        "A queue that sorts elements using circular hashing.",
        "A queue that rejects any duplicate numbers.",
        "A queue implemented on an infinite linked loop.",
      ],
      correctAnswer: "A queue where the last position connects back to the first position to reuse deallocated memory slots.",
      explanation: "A circular queue wraps its rear pointer back to index 0 using modulo arithmetic (`(rear + 1) % capacity`) to prevent wasted space after dequeuing.",
    },
    {
      id: "ds_10",
      question: "What is the worst-case time complexity of QuickSort when a poor pivot is repeatedly selected?",
      options: ["O(n^2)", "O(n log n)", "O(n)", "O(log n)"],
      correctAnswer: "O(n^2)",
      explanation: "If the chosen pivot is always the smallest or largest element (e.g. sorted input with naive pivot), QuickSort degrades to O(n^2).",
    },
    {
      id: "ds_11",
      question: "Which data structure is most suitable for implementing an LRU (Least Recently Used) Cache with O(1) get and put?",
      options: [
        "Hash Map combined with a Doubly Linked List",
        "Single Binary Search Tree",
        "Sorted Array",
        "FIFO Queue with linear scan",
      ],
      correctAnswer: "Hash Map combined with a Doubly Linked List",
      explanation: "A Hash Map provides O(1) lookup to nodes, while a Doubly Linked List allows O(1) removal and moving of accessed nodes to the front/head.",
    },
    {
      id: "ds_12",
      question: "In an Adjacency Matrix representing a graph with V vertices, how much space is required?",
      options: ["O(V^2)", "O(V + E)", "O(E log V)", "O(V)"],
      correctAnswer: "O(V^2)",
      explanation: "An adjacency matrix allocates a V x V 2D array, consuming O(V^2) memory regardless of how sparse the edge count is.",
    },
  ],

  spanish: [
    {
      id: "sp_1",
      question: "In Spanish, when should you use the verb 'ser' instead of 'estar'?",
      options: [
        "For essential characteristics, identity, profession, origin, and time.",
        "For temporary states, physical location, and health conditions.",
        "Exclusively when speaking in the past subjunctive mood.",
        "Only when describing weather and ongoing actions.",
      ],
      correctAnswer: "For essential characteristics, identity, profession, origin, and time.",
      explanation: "'Ser' is used for permanent/inherent traits, identity, nationality, profession, and time. 'Estar' is for locations, conditions, and temporary states.",
    },
    {
      id: "sp_2",
      question: "Which preposition correctly fills the blank to express cause/reason: 'Gracias ___ tu ayuda'?",
      options: ["por", "para", "de", "con"],
      correctAnswer: "por",
      explanation: "'Por' expresses cause, reason, gratitude ('gracias por'), exchange, or duration. 'Para' expresses destination, recipient, or purpose.",
    },
    {
      id: "sp_3",
      question: "What is the difference between the Preterite and Imperfect tenses in Spanish?",
      options: [
        "Preterite describes completed actions with clear endpoints; Imperfect describes ongoing, habitual, or descriptive past actions.",
        "Preterite is for future events; Imperfect is for past events.",
        "Preterite is only used in formal writing; Imperfect in speech.",
        "There is no difference; they are interchangeable.",
      ],
      correctAnswer: "Preterite describes completed actions with clear endpoints; Imperfect describes ongoing, habitual, or descriptive past actions.",
      explanation: "The preterite views an action as a completed unit in time. The imperfect sets the background, describes ongoing states, or narrates habits.",
    },
    {
      id: "sp_4",
      question: "How do you conjugate the irregular verb 'ir' (to go) in the first person singular ('yo') present tense?",
      options: ["voy", "vo", "iba", "fui"],
      correctAnswer: "voy",
      explanation: "The present tense indicative of 'ir' is: yo voy, tú vas, él/ella va, nosotros vamos, ellos van.",
    },
    {
      id: "sp_5",
      question: "When is the subjunctive mood required in Spanish?",
      options: [
        "To express doubt, wishes, uncertainty, emotions, or hypothetical non-factual situations.",
        "Only when asking direct questions with question marks.",
        "Exclusively in commands addressed to children.",
        "Whenever stating objective scientific facts.",
      ],
      correctAnswer: "To express doubt, wishes, uncertainty, emotions, or hypothetical non-factual situations.",
      explanation: "The subjunctive mood expresses subjective reality: desires ('quiero que vengas'), doubts ('dudo que sea verdad'), and hypothetical situations.",
    },
    {
      id: "sp_6",
      question: "What is the correct translation of 'I like books' in Spanish?",
      options: ["Me gustan los libros.", "Yo gusto los libros.", "A mí gusta libros.", "Me gusto los libros."],
      correctAnswer: "Me gustan los libros.",
      explanation: "The verb 'gustar' agrees with the subject that pleases: 'los libros' is plural, so the verb is conjugated as 'gustan', preceded by indirect pronoun 'me'.",
    },
    {
      id: "sp_7",
      question: "What is a false cognate (falso amigo) in Spanish language learning?",
      options: [
        "Words that look or sound similar to English words but have completely different meanings.",
        "Words borrowed directly from English without pronunciation changes.",
        "Slang words used only in Madrid.",
        "Verbs that lack an infinitive form.",
      ],
      correctAnswer: "Words that look or sound similar to English words but have completely different meanings.",
      explanation: "False cognates look like English words but differ in meaning, such as 'embarazada' (pregnant, not embarrassed) or 'éxito' (success, not exit).",
    },
    {
      id: "sp_8",
      question: "Which sentence correctly demonstrates gender and number agreement in Spanish?",
      options: [
        "Las casas blancas son hermosas.",
        "Los casas blanco son hermosa.",
        "La casas blancas es hermoso.",
        "Las casas blancos son hermosa.",
      ],
      correctAnswer: "Las casas blancas son hermosas.",
      explanation: "'Casas' is feminine and plural, requiring the feminine plural article 'Las', adjective 'blancas', and predicate adjective 'hermosas'.",
    },
    {
      id: "sp_9",
      question: "Where are object pronouns placed relative to conjugated verbs in standard Spanish?",
      options: [
        "Immediately before the conjugated verb (e.g. 'Te lo doy').",
        "Always at the very end of the paragraph.",
        "Inside the noun phrase following prepositions.",
        "Directly between the subject pronoun and proper name.",
      ],
      correctAnswer: "Immediately before the conjugated verb (e.g. 'Te lo doy').",
      explanation: "Direct and indirect object pronouns precede conjugated verbs in indicative/subjunctive sentences, but attach to the end of infinitives, gerunds, and affirmative commands.",
    },
    {
      id: "sp_10",
      question: "What does the conversational Spanish idiom 'tomar el pelo' mean?",
      options: [
        "To pull someone's leg / tease someone jokingly.",
        "To get a haircut at a salon.",
        "To lose one's temper in public.",
        "To comb one's hair before a meeting.",
      ],
      correctAnswer: "To pull someone's leg / tease someone jokingly.",
      explanation: "'Tomar el pelo' literally means 'to take the hair', but idiomatically means 'to tease' or 'pull someone's leg'.",
    },
    {
      id: "sp_11",
      question: "How is the formal 'you' addressed in Spanish?",
      options: ["Usted (singular) / Ustedes (plural)", "Tú / Vosotros", "Él / Ellos", "Vos / Nosotros"],
      correctAnswer: "Usted (singular) / Ustedes (plural)",
      explanation: "'Usted' (abbreviated Ud.) and 'Ustedes' (Uds.) are the polite, formal second-person pronouns, grammatically taking third-person verb forms.",
    },
    {
      id: "sp_12",
      question: "What is the gerund (present participle) form of the verb 'leer' (to read)?",
      options: ["leyendo", "leiendo", "leido", "leando"],
      correctAnswer: "leyendo",
      explanation: "For verbs with stems ending in a vowel like leer (le-), the unaccented 'i' in '-iendo' changes to 'y' to prevent three consecutive vowels: leyendo.",
    },
  ],

  "public relations": [
    {
      id: "pr_1",
      question: "What is the primary objective of a press release in public relations?",
      options: [
        "To deliver newsworthy information to media journalists and editors in an objective, standard format.",
        "To replace all paid digital advertising campaigns.",
        "To communicate confidential internal executive salaries to employees.",
        "To file mandatory copyright disclosures with the government.",
      ],
      correctAnswer: "To deliver newsworthy information to media journalists and editors in an objective, standard format.",
      explanation: "A press release is an official statement sent to journalists containing timely, factual, and newsworthy announcements designed to earn earned media coverage.",
    },
    {
      id: "pr_2",
      question: "In the inverted pyramid writing style used in PR releases, how is information arranged?",
      options: [
        "Most crucial facts (Who, What, When, Where, Why) at the beginning, followed by supporting details and background.",
        "Chronological order starting from the company's founding date.",
        "Vague teasers first, saving the main announcement for the final sentence.",
        "Alphabetical order based on executive titles.",
      ],
      correctAnswer: "Most crucial facts (Who, What, When, Where, Why) at the beginning, followed by supporting details and background.",
      explanation: "The inverted pyramid front-loads the most critical news in the lead paragraph so editors grasp the essence immediately.",
    },
    {
      id: "pr_3",
      question: "What is a media embargo in public relations?",
      options: [
        "An agreement with journalists that news shared in advance will not be published until a specific date and time.",
        "A legal ban prohibiting a media outlet from ever contacting a company.",
        "A government tax on printed newspaper circulation.",
        "A boycott of all social media channels by an organization.",
      ],
      correctAnswer: "An agreement with journalists that news shared in advance will not be published until a specific date and time.",
      explanation: "An embargo allows journalists time to research and prepare detailed stories ahead of a launch, under an agreement not to publish before the agreed release time.",
    },
    {
      id: "pr_4",
      question: "What is the critical first step in PR crisis communication management?",
      options: [
        "Acknowledge the situation promptly with verified facts, express genuine empathy, and outline corrective actions.",
        "Deny all allegations and immediately blame external vendors.",
        "Delete all company social media accounts and refuse all press calls.",
        "Issue a discount coupon to all existing customers.",
      ],
      correctAnswer: "Acknowledge the situation promptly with verified facts, express genuine empathy, and outline corrective actions.",
      explanation: "Crisis response demands prompt transparency, accountable leadership, empathy for affected parties, and clear remediation steps to preserve institutional trust.",
    },
    {
      id: "pr_5",
      question: "What is 'earned media' in the PESO model (Paid, Earned, Shared, Owned)?",
      options: [
        "Unpaid publicity gained through editorial media coverage, interviews, or reviews.",
        "Sponsored banner ads purchased on search engines.",
        "Articles published on the company's own corporate blog.",
        "Posts published directly to the brand's Instagram account.",
      ],
      correctAnswer: "Unpaid publicity gained through editorial media coverage, interviews, or reviews.",
      explanation: "Earned media is third-party editorial credibility earned through pitching or organic interest, distinct from Paid ads, Shared social media, or Owned websites.",
    },
    {
      id: "pr_6",
      question: "What is a 'boilerplate' in a standard press release?",
      options: [
        "A standardized paragraph at the end summarizing what the organization is, its mission, and its core business.",
        "The catchy headline written in bold capital letters.",
        "The legal disclaimer warning journalists against copyright theft.",
        "The contact email of the software developer who built the website.",
      ],
      correctAnswer: "A standardized paragraph at the end summarizing what the organization is, its mission, and its core business.",
      explanation: "The boilerplate (e.g. 'About Acme Corp') provides consistent background context on the company at the bottom of every press release.",
    },
    {
      id: "pr_7",
      question: "What does stakeholder mapping involve in strategic PR planning?",
      options: [
        "Identifying, categorizing, and prioritizing all internal and external groups affected by or having influence over an organization.",
        "Creating geographic GPS routes for delivery trucks.",
        "Designing the organizational chart for the IT department.",
        "Purchasing email lists from third-party advertising brokers.",
      ],
      correctAnswer: "Identifying, categorizing, and prioritizing all internal and external groups affected by or having influence over an organization.",
      explanation: "Stakeholder mapping analyzes audiences (investors, employees, customers, regulators, media) based on their interest and influence level.",
    },
    {
      id: "pr_8",
      question: "What distinguishes Public Relations (PR) from Advertising?",
      options: [
        "PR focuses on building relationships and earned organic credibility; Advertising pays directly for guaranteed placement and control.",
        "PR is illegal in democratic countries; Advertising is permitted.",
        "PR only targets internal staff; Advertising targets external audiences.",
        "There is no difference; they are identical commercial practices.",
      ],
      correctAnswer: "PR focuses on building relationships and earned organic credibility; Advertising pays directly for guaranteed placement and control.",
      explanation: "As the adage goes: 'Advertising is what you pay for; publicity is what you pray for.' PR builds third-party credibility through earned media.",
    },
    {
      id: "pr_9",
      question: "What is media monitoring in public relations practice?",
      options: [
        "Tracking print, broadcast, online, and social media coverage to gauge brand sentiment, reach, and reputational trends.",
        "Auditing television studio equipment for electrical safety compliance.",
        "Restricting employee personal internet usage on company computers.",
        "Censoring negative comments on customer support forums.",
      ],
      correctAnswer: "Tracking print, broadcast, online, and social media coverage to gauge brand sentiment, reach, and reputational trends.",
      explanation: "Media monitoring tracks mentions, sentiment, share of voice, and competitive positioning across diverse news and social outlets.",
    },
    {
      id: "pr_10",
      question: "What is an effective practice when writing a media pitch email to a journalist?",
      options: [
        "Personalizing the angle to the journalist's specific beat, showing relevance to their readers, and being concise.",
        "Sending an identical mass BCC email to 5,000 journalists simultaneously.",
        "Attaching a 50MB uncompressed ZIP file of product photos.",
        "Demanding that the story be published on the front page tomorrow morning.",
      ],
      correctAnswer: "Personalizing the angle to the journalist's specific beat, showing relevance to their readers, and being concise.",
      explanation: "Journalists receive hundreds of pitches daily; a tailored, succinct pitch demonstrating direct relevance to their target audience is most effective.",
    },
    {
      id: "pr_11",
      question: "In crisis management, what does a 'holding statement' accomplish?",
      options: [
        "Provides immediate initial acknowledgment while facts are being gathered, preventing information vacuums.",
        "Guarantees that no financial losses will occur.",
        "Blocks journalists from asking further questions permanently.",
        "Announces executive retirement packages.",
      ],
      correctAnswer: "Provides immediate initial acknowledgment while facts are being gathered, preventing information vacuums.",
      explanation: "A holding statement demonstrates responsiveness early in a crisis while the response team verifies details, showing that leadership is engaged.",
    },
    {
      id: "pr_12",
      question: "What is 'media training' designed to prepare spokespersons for?",
      options: [
        "Staying on message, handling aggressive questioning, framing key points concisely, and projecting confident body language.",
        "Reading teleprompters without blinking for 20 minutes.",
        "Editing broadcast video files in Adobe Premiere.",
        "Memorizing legal statute numbers for courtroom depositions.",
      ],
      correctAnswer: "Staying on message, handling aggressive questioning, framing key points concisely, and projecting confident body language.",
      explanation: "Media training coaches executives and spokespersons to bridge back to core messages, avoid traps, speak in soundbites, and convey calm credibility.",
    },
  ],

  cooking: [
    {
      id: "ck_1",
      question: "Which of the following is considered one of Auguste Escoffier's five classical French 'Mother Sauces'?",
      options: ["Béchamel", "Chimichurri", "Pesto", "Bolognese"],
      correctAnswer: "Béchamel",
      explanation: "The five classical French mother sauces are Béchamel, Velouté, Espagnole, Sauce Tomat, and Hollandaise.",
    },
    {
      id: "ck_2",
      question: "What is the chemical reaction responsible for the browning and deep savory flavor of seared meats and baked bread crusts?",
      options: ["The Maillard reaction", "Fermentation", "Photosynthesis", "Gelatinization"],
      correctAnswer: "The Maillard reaction",
      explanation: "The Maillard reaction is a chemical reaction between amino acids and reducing sugars that occurs around 140°C–165°C (280°F–330°F), creating complex browning flavors.",
    },
    {
      id: "ck_3",
      question: "What is the safest internal cooking temperature recommended by food safety authorities for poultry (chicken and turkey)?",
      options: [
        "165°F (74°C)",
        "130°F (54°C)",
        "145°F (63°C)",
        "200°F (93°C)",
      ],
      correctAnswer: "165°F (74°C)",
      explanation: "The USDA recommends cooking all poultry to an internal temperature of 165°F (74°C) to instantaneously eliminate salmonella and foodborne pathogens.",
    },
    {
      id: "ck_4",
      question: "What is a roux in classical cooking?",
      options: [
        "An equal mixture of fat (such as butter) and flour cooked together, used to thicken sauces and soups.",
        "A blend of raw spices toasted in dry cast iron.",
        "A delicate sugar glaze brushed onto baked pastries.",
        "A marinade consisting of vinegar, olive oil, and herbs.",
      ],
      correctAnswer: "An equal mixture of fat (such as butter) and flour cooked together, used to thicken sauces and soups.",
      explanation: "A roux combines equal parts by weight of fat (traditionally butter) and all-purpose flour, cooked to white, blond, or brown stages to thicken liquid bases.",
    },
    {
      id: "ck_5",
      question: "What culinary term describes cutting vegetables into very fine matchstick shapes (typically 1/8 in × 1/8 in × 2 in)?",
      options: ["Julienne", "Brunoise", "Chiffonade", "Batonnet"],
      correctAnswer: "Julienne",
      explanation: "Julienne is a classical knife cut producing thin matchsticks approximately 1/8 inch thick by 2 inches long.",
    },
    {
      id: "ck_6",
      question: "Why should extra virgin olive oil NOT be used for deep frying or high-heat searing?",
      options: [
        "It has a relatively low smoke point and degrades quickly, creating acrid flavors and harmful compounds.",
        "It will prevent food from absorbing salt.",
        "It turns into pure gelatin when heated above 100°C.",
        "It dissolves stainless steel cookware.",
      ],
      correctAnswer: "It has a relatively low smoke point and degrades quickly, creating acrid flavors and harmful compounds.",
      explanation: "Extra virgin olive oil has a smoke point around 375°F (190°C) and unrefined particulates that scorch under high searing heat; high smoke point neutral oils (canola, avocado, peanut) are preferred.",
    },
    {
      id: "ck_7",
      question: "What is an emulsion in food science?",
      options: [
        "A stable mixture of two immiscible liquids (like oil and water) facilitated by an emulsifying agent.",
        "The boiling point elevation caused by dissolved salt.",
        "The drying of fresh herbs in a low-humidity oven.",
        "The crystal formation in frozen ice cream.",
      ],
      correctAnswer: "A stable mixture of two immiscible liquids (like oil and water) facilitated by an emulsifying agent.",
      explanation: "An emulsion (e.g. mayonnaise, hollandaise, vinaigrette) combines oil and water droplets stabilized by emulsifiers like lecithin (found in egg yolk) or mustard.",
    },
    {
      id: "ck_8",
      question: "What culinary technique is referred to as 'mise en place'?",
      options: [
        "Gathering, measuring, prepping, and organizing all ingredients and tools before starting to cook.",
        "Cooking food slowly inside an airtight vacuum bag in a water bath.",
        "Flambéing dishes with brandy in front of guests.",
        "Plating dessert using delicate sugar garnishes.",
      ],
      correctAnswer: "Gathering, measuring, prepping, and organizing all ingredients and tools before starting to cook.",
      explanation: "French for 'everything in its place', mise en place is the discipline of having all vegetables chopped, sauces measured, and utensils ready before heat is applied.",
    },
    {
      id: "ck_9",
      question: "What is the primary culinary function of salt in cooking beyond adding saltiness?",
      options: [
        "It enhances natural aromas, suppresses bitterness, and draws out moisture through osmosis.",
        "It doubles the calorie density of vegetables.",
        "It prevents all bacteria from ever growing at room temperature.",
        "It turns red meat white when simmering.",
      ],
      correctAnswer: "It enhances natural aromas, suppresses bitterness, and draws out moisture through osmosis.",
      explanation: "Salt is a fundamental flavor amplifier: it suppresses bitter compounds, heightens perceived sweetness, and penetrates cellular structures via osmosis.",
    },
    {
      id: "ck_10",
      question: "What is 'deglazing' a pan?",
      options: [
        "Adding liquid (like wine, stock, or vinegar) to dissolve and release caramelized browned bits (fond) stuck to the bottom of the pan.",
        "Scraping burnt food into the trash can.",
        "Polishing copper pots with lemon juice and salt.",
        "Cooling a hot skillet in ice water.",
      ],
      correctAnswer: "Adding liquid (like wine, stock, or vinegar) to dissolve and release caramelized browned bits (fond) stuck to the bottom of the pan.",
      explanation: "Deglazing pours liquid into a hot pan after searing, loosening the caramelized fond to form rich pan sauces and gravies.",
    },
    {
      id: "ck_11",
      question: "What is the key difference between baking powder and baking soda?",
      options: [
        "Baking soda is pure sodium bicarbonate requiring an acid to activate; baking powder already includes a powdered acid.",
        "Baking powder is for bread; baking soda is only for cleaning countertops.",
        "Baking soda contains yeast spores; baking powder does not.",
        "They are identical chemical compounds with different trade names.",
      ],
      correctAnswer: "Baking soda is pure sodium bicarbonate requiring an acid to activate; baking powder already includes a powdered acid.",
      explanation: "Baking soda (alkaline base) requires an acidic ingredient (buttermilk, lemon, cocoa) to produce CO2 bubbles. Baking powder contains both base and dry acid (plus starch), needing only moisture and heat.",
    },
    {
      id: "ck_12",
      question: "Why is resting meat after cooking (e.g. steak or roast) essential?",
      options: [
        "It allows muscle fibers to relax and moisture to redistribute evenly throughout the meat, preventing juices from escaping.",
        "It makes the meat change from well-done to rare.",
        "It cools the meat down so it can be eaten with bare hands.",
        "It prevents salt from dissolving into the crust.",
      ],
      correctAnswer: "It allows muscle fibers to relax and moisture to redistribute evenly throughout the meat, preventing juices from escaping.",
      explanation: "Resting allows contracted muscle fibers to relax and reabsorb moisture. Slicing immediately causes hot savory juices to spill onto the cutting board.",
    },
  ],

  "ui design": [
    {
      id: "ui_1",
      question: "What does visual hierarchy establish in a user interface?",
      options: [
        "The order in which the human eye perceives and processes information on a screen.",
        "The file storage hierarchy on the backend server.",
        "The pricing tiers displayed on an e-commerce subscription page.",
        "The version control branch naming strategy.",
      ],
      correctAnswer: "The order in which the human eye perceives and processes information on a screen.",
      explanation: "Visual hierarchy guides users' attention using scale, contrast, color, spacing, and typography so primary actions and key data stand out first.",
    },
    {
      id: "ui_2",
      question: "What is the primary benefit of using an 8pt grid system in UI design?",
      options: [
        "It creates consistent spatial rhythm, harmonious alignment, and scales cleanly across various screen densities.",
        "It restricts all interface fonts to exactly 8 pixels in height.",
        "It guarantees that websites load in under 8 milliseconds.",
        "It eliminates the need for user testing.",
      ],
      correctAnswer: "It creates consistent spatial rhythm, harmonious alignment, and scales cleanly across various screen densities.",
      explanation: "Multiples of 8 (8, 16, 24, 32, 48, 64) divide cleanly across modern screen resolutions (1x, 2x, 3x displays), streamlining developer handoff.",
    },
    {
      id: "ui_3",
      question: "In Figma, what feature allows a component to adapt its layout automatically when child content changes size?",
      options: ["Auto Layout", "Smart Animate", "Vector Network", "Union Selection"],
      correctAnswer: "Auto Layout",
      explanation: "Figma's Auto Layout behaves like CSS Flexbox, automatically adjusting component height, width, and sibling positions as text or padding changes.",
    },
    {
      id: "ui_4",
      question: "What is an 'affordance' in interaction design?",
      options: [
        "Visual visual cues or physical characteristics that communicate how an object or UI control should be used.",
        "The monetary budget allocated to visual designers.",
        "The maximum download time of an animation asset.",
        "The server CPU cost of rendering vector SVGs.",
      ],
      correctAnswer: "Visual visual cues or physical characteristics that communicate how an object or UI control should be used.",
      explanation: "An affordance (e.g. raised appearance of a button, underlined hyperlink) clearly signals how a user can interact with the element.",
    },
    {
      id: "ui_5",
      question: "Why should UI designers avoid relying solely on color to convey critical status (e.g. red for errors, green for success)?",
      options: [
        "Color-blind users may not be able to distinguish between color hues; icons and descriptive text must accompany color cues.",
        "Colors consume excessive GPU bandwidth on mobile phones.",
        "Modern web browsers strip out all CSS colors in night mode.",
        "Colors increase server database latency.",
      ],
      correctAnswer: "Color-blind users may not be able to distinguish between color hues; icons and descriptive text must accompany color cues.",
      explanation: "Accessibility guidelines (WCAG 1.4.1) mandate that color should never be the sole visual means of conveying information, actions, or errors.",
    },
    {
      id: "ui_6",
      question: "What is a Design System in digital product design?",
      options: [
        "A centralized collection of reusable components, design tokens, principles, and guidelines guiding product consistency.",
        "A computer operating system created exclusively for graphic artists.",
        "A single Figma file with random moodboard screenshots.",
        "A proprietary programming language replacing JavaScript.",
      ],
      correctAnswer: "A centralized collection of reusable components, design tokens, principles, and guidelines guiding product consistency.",
      explanation: "A Design System (like Material Design or Polaris) unites design tokens (colors, typography, spacing) with code components to scale cohesive UX.",
    },
    {
      id: "ui_7",
      question: "What does Fitts's Law state in human-computer interaction?",
      options: [
        "The time required to rapidly move to a target area is a function of the distance to the target and the target's size.",
        "Users spend most of their time on other websites, so your site should look like them.",
        "Every page must load in less than 2 seconds.",
        "Interfaces should have no more than 7 menu items.",
      ],
      correctAnswer: "The time required to rapidly move to a target area is a function of the distance to the target and the target's size.",
      explanation: "Fitts's Law explains that larger, closer interactive targets (like buttons) are easier and faster for users to click or tap accurately.",
    },
    {
      id: "ui_8",
      question: "What is the recommended minimum touch target size for interactive mobile elements under Apple and Google guidelines?",
      options: ["44x44 to 48x48 points/dp", "10x10 pixels", "120x120 points", "24x24 pixels"],
      correctAnswer: "44x44 to 48x48 points/dp",
      explanation: "Apple's Human Interface Guidelines recommend 44x44pt and Google Material Design recommends 48x48dp to ensure human thumbs can tap without misclicks.",
    },
    {
      id: "ui_9",
      question: "In typography, what is the difference between kerning and tracking?",
      options: [
        "Kerning adjusts spacing between specific pairs of letters; tracking adjusts spacing uniformly across an entire block of text.",
        "Kerning is for headers; tracking is only for page footers.",
        "Tracking changes font weight; kerning changes font size.",
        "There is no difference; they are synonymous.",
      ],
      correctAnswer: "Kerning adjusts spacing between specific pairs of letters; tracking adjusts spacing uniformly across an entire block of text.",
      explanation: "Kerning fine-tunes awkward spaces between two adjacent characters (like 'AV' or 'To'), while tracking applies uniform letter-spacing across a string.",
    },
    {
      id: "ui_10",
      question: "What is 'whitespace' (negative space) and why is it crucial in UI design?",
      options: [
        "Unmarked areas between design elements that reduce visual clutter, group related content, and create breathing room.",
        "Empty screen pixels that are physically colored white (#FFFFFF).",
        "Wasted space that should always be filled with promotional banners.",
        "A bug in CSS where margin collapsing fails.",
      ],
      correctAnswer: "Unmarked areas between design elements that reduce visual clutter, group related content, and create breathing room.",
      explanation: "Whitespace separates visual components, improves reading comprehension, indicates relationships (Gestalt proximity), and creates an elegant, uncluttered feel.",
    },
    {
      id: "ui_11",
      question: "What is a micro-interaction in product design?",
      options: [
        "Subtle, focused animations or visual feedback responding to a user action (e.g. a button hover state or toggle switch slide).",
        "A website designed exclusively for smartwatches.",
        "An API request that transmits less than 1 kilobyte of data.",
        "A user test session lasting under 5 minutes.",
      ],
      correctAnswer: "Subtle, focused animations or visual feedback responding to a user action (e.g. a button hover state or toggle switch slide).",
      explanation: "Micro-interactions provide delightful, intuitive feedback (like like-button heart bursts, pull-to-refresh haptics, or switch flips) that confirms actions.",
    },
    {
      id: "ui_12",
      question: "What is the purpose of design tokens in modern UI architectures?",
      options: [
        "Platform-agnostic key-value pairs (for colors, spacing, typography) that sync design tools with production CSS/codebases.",
        "Cryptocurrency rewards given to UI designers upon task completion.",
        "OAuth authentication tokens used for logging into Figma.",
        "Browser cookies that store user theme preferences.",
      ],
      correctAnswer: "Platform-agnostic key-value pairs (for colors, spacing, typography) that sync design tools with production CSS/codebases.",
      explanation: "Design tokens store raw design decisions (e.g. `color.primary = #2563eb`) in JSON or YAML, exporting variables across Web, iOS, and Android seamlessly.",
    },
  ],

  excel: [
    {
      id: "xl_1",
      question: "What does the `$` symbol represent in an Excel formula like `$A$1`?",
      options: [
        "An absolute reference that locks the column and row so they do not shift when copied across cells.",
        "A currency format indicating United States Dollars.",
        "A pointer to an external workbook file.",
        "A division operator for floating point percentages.",
      ],
      correctAnswer: "An absolute reference that locks the column and row so they do not shift when copied across cells.",
      explanation: "Placing `$` before column and row (`$A$1`) makes it an absolute reference, preventing Excel from shifting coordinates when dragging or pasting formulas.",
    },
    {
      id: "xl_2",
      question: "Why is `XLOOKUP` widely preferred over traditional `VLOOKUP` in modern Excel?",
      options: [
        "It can search in any direction (left or right), defaults to exact match, and doesn't break when columns are inserted.",
        "It is the only formula that works on numbers.",
        "It automatically formats cells with conditional colors.",
        "It requires zero parameters.",
      ],
      correctAnswer: "It can search in any direction (left or right), defaults to exact match, and doesn't break when columns are inserted.",
      explanation: "Unlike VLOOKUP (which requires lookups to the right and static column index numbers), XLOOKUP works left/right, defaults to exact match, and handles missing values gracefully.",
    },
    {
      id: "xl_3",
      question: "What is the primary function of an Excel Pivot Table?",
      options: [
        "To rapidly summarize, aggregate, filter, and analyze large datasets without writing complex formulas.",
        "To rotate the physical orientation of printed paper.",
        "To delete duplicate rows from a CSV export.",
        "To encrypt sensitive financial spreadsheets with passwords.",
      ],
      correctAnswer: "To rapidly summarize, aggregate, filter, and analyze large datasets without writing complex formulas.",
      explanation: "Pivot Tables allow interactive multidimensional data exploration: grouping by categories, summing revenues, calculating averages, and pivoting rows and columns dynamically.",
    },
    {
      id: "xl_4",
      question: "What is the formula combination `INDEX` and `MATCH` classically used for?",
      options: [
        "A flexible two-way lookup that finds values by matching row and column criteria independently of layout.",
        "Calculating standard deviation across multiple worksheets.",
        "Generating random alphanumeric security passwords.",
        "Importing SQL databases into raw text strings.",
      ],
      correctAnswer: "A flexible two-way lookup that finds values by matching row and column criteria independently of layout.",
      explanation: "MATCH finds the relative position of a lookup value in an array, and INDEX retrieves the value at that position, creating a robust, non-fragile lookup mechanism.",
    },
    {
      id: "xl_5",
      question: "What function adds values in a range that meet multiple specified criteria?",
      options: ["SUMIFS", "SUMIF", "TOTALIF", "COUNTIFS"],
      correctAnswer: "SUMIFS",
      explanation: "`SUMIFS(sum_range, criteria_range1, criteria1, ...)` evaluates multiple simultaneous conditions, summing only matching cells.",
    },
    {
      id: "xl_6",
      question: "What does the error `#N/A` mean in Excel?",
      options: [
        "A lookup formula could not find the referenced value in the search range.",
        "A formula attempted to divide a number by zero.",
        "A text string contains invalid characters.",
        "The workbook has exceeded memory limits.",
      ],
      correctAnswer: "A lookup formula could not find the referenced value in the search range.",
      explanation: "`#N/A` stands for 'No Value Available' and typically appears when VLOOKUP, MATCH, or XLOOKUP cannot locate a matching key.",
    },
    {
      id: "xl_7",
      question: "What feature in Excel restricts the type of data or values that users can enter into a specific cell (e.g. dropdown lists)?",
      options: ["Data Validation", "Conditional Formatting", "Goal Seek", "Text to Columns"],
      correctAnswer: "Data Validation",
      explanation: "Data Validation sets rules on user input, such as restricting entries to whole numbers, dates, or selecting from custom in-cell dropdown lists.",
    },
    {
      id: "xl_8",
      question: "What does the `IFERROR(value, value_if_error)` function do?",
      options: [
        "Evaluates a formula and returns an alternative result (like 0 or a clean message) if an error occurs.",
        "Stops Excel from saving the file if an error is present.",
        "Emails the spreadsheet administrator when a formula fails.",
        "Permanently deletes cells containing errors.",
      ],
      correctAnswer: "Evaluates a formula and returns an alternative result (like 0 or a clean message) if an error occurs.",
      explanation: "IFERROR wraps formulas to trap error codes (`#N/A`, `#VALUE!`, `#DIV/0!`) and supply friendly fallbacks without breaking reporting models.",
    },
    {
      id: "xl_9",
      question: "Which keyboard shortcut in Excel for Windows creates a new table from the selected range?",
      options: ["Ctrl + T", "Ctrl + P", "Ctrl + B", "Ctrl + Shift + F"],
      correctAnswer: "Ctrl + T",
      explanation: "Pressing `Ctrl + T` (or `Ctrl + L`) opens the Create Table dialog, transforming a raw range into a structured Excel Table with sorting and auto-expansion.",
    },
    {
      id: "xl_10",
      question: "What is Conditional Formatting in Excel?",
      options: [
        "A feature that automatically applies cell formatting (colors, data bars, icons) based on cell values or logical rules.",
        "A macro that automatically sends spreadsheets to printers.",
        "A requirement that users accept license terms before editing.",
        "A formula that renames worksheet tabs.",
      ],
      correctAnswer: "A feature that automatically applies cell formatting (colors, data bars, icons) based on cell values or logical rules.",
      explanation: "Conditional formatting dynamically highlights outliers, top performers, duplicates, and trends using color scales, heatmaps, and icon sets.",
    },
    {
      id: "xl_11",
      question: "What does the `COUNTBLANK(range)` function do?",
      options: [
        "Counts the number of empty cells in a specified range.",
        "Fills all blank cells with zero.",
        "Deletes all blank rows from the active sheet.",
        "Counts cells containing the word 'blank'.",
      ],
      correctAnswer: "Counts the number of empty cells in a specified range.",
      explanation: "COUNTBLANK returns the integer count of truly empty cells in the specified range.",
    },
    {
      id: "xl_12",
      question: "What is an Excel 'What-If Analysis' tool such as Goal Seek used for?",
      options: [
        "Finding the input value needed to achieve a desired specific formula outcome.",
        "Checking spelling across all worksheets.",
        "Translating English cell labels to French.",
        "Generating mock dummy data for demonstrations.",
      ],
      correctAnswer: "Finding the input value needed to achieve a desired specific formula outcome.",
      explanation: "Goal Seek adjusts an input cell iteratively until a dependent formula reaches an exact designated target value.",
    },
  ],

  photography: [
    {
      id: "ph_1",
      question: "What three camera settings comprise the fundamental 'Exposure Triangle' in photography?",
      options: [
        "Aperture, Shutter Speed, and ISO",
        "Focal Length, White Balance, and Resolution",
        "Contrast, Saturation, and Sharpness",
        "Zoom, Focus, and Metering",
      ],
      correctAnswer: "Aperture, Shutter Speed, and ISO",
      explanation: "The exposure triangle consists of Aperture (lens opening), Shutter Speed (duration of light), and ISO (sensor sensitivity). Together they dictate exposure and creative look.",
    },
    {
      id: "ph_2",
      question: "How does opening the aperture wider (e.g. from f/8 to f/1.8) affect depth of field?",
      options: [
        "It creates a shallower depth of field, blurring the background (bokeh).",
        "It makes the entire scene from foreground to horizon completely sharp.",
        "It doubles the shutter speed automatically.",
        "It eliminates all light from hitting the sensor.",
      ],
      correctAnswer: "It creates a shallower depth of field, blurring the background (bokeh).",
      explanation: "Smaller f-numbers (wider aperture openings like f/1.4 or f/1.8) produce a shallow depth of field, separating sharp subjects from softly blurred backgrounds.",
    },
    {
      id: "ph_3",
      question: "What is the primary visual risk of shooting at very high ISO settings (e.g. ISO 12,800)?",
      options: [
        "Introducing noticeable digital noise and grain, reducing dynamic range and fine detail.",
        "Causing the physical camera shutter to jam.",
        "Inverting all colors into negative monochrome.",
        "Narrowing the lens angle of view.",
      ],
      correctAnswer: "Introducing noticeable digital noise and grain, reducing dynamic range and fine detail.",
      explanation: "Higher ISO amplifies the electrical sensor signal in low light, which also amplifies background sensor noise, resulting in visual grain and loss of contrast.",
    },
    {
      id: "ph_4",
      question: "What is the composition guideline known as the 'Rule of Thirds'?",
      options: [
        "Dividing the frame into a 3x3 grid with two horizontal and two vertical lines, placing points of interest along the lines or intersections.",
        "Taking exactly three photos of every subject.",
        "Only shooting photographs between 3 PM and 6 PM.",
        "Balancing three equal light sources around the subject.",
      ],
      correctAnswer: "Dividing the frame into a 3x3 grid with two horizontal and two vertical lines, placing points of interest along the lines or intersections.",
      explanation: "The Rule of Thirds positions subjects and horizons along grid intersections (crash points) to create natural balance and dynamism.",
    },
    {
      id: "ph_5",
      question: "What is the primary advantage of capturing photos in RAW format rather than JPEG?",
      options: [
        "RAW files preserve uncompressed sensor data, offering far greater flexibility in recovering highlights, shadows, and white balance.",
        "RAW files take up less memory card storage space.",
        "RAW photos can be posted directly to Instagram without editing.",
        "RAW files apply permanent creative color filters in-camera.",
      ],
      correctAnswer: "RAW files preserve uncompressed sensor data, offering far greater flexibility in recovering highlights, shadows, and white balance.",
      explanation: "Unlike JPEGs (which bake in compression and discard tonal data), RAW records all sensor information, allowing robust exposure and color recovery in post-processing.",
    },
    {
      id: "ph_6",
      question: "What shutter speed is generally recommended as a baseline minimum when freezing fast athletic action?",
      options: ["1/1000s or faster", "1/15s", "1/2s", "1/60s with long exposure"],
      correctAnswer: "1/1000s or faster",
      explanation: "Freezing high-speed sports or rapid movements requires brief shutter durations like 1/1000s or 1/2000s to avoid motion blur.",
    },
    {
      id: "ph_7",
      question: "What does a histogram display on a digital camera?",
      options: [
        "A graphical representation of the tonal distribution of shadows, midtones, and highlights across the exposure.",
        "A battery power drainage chart over time.",
        "The geographical elevation coordinates of the camera.",
        "A calendar scheduling upcoming photo shoots.",
      ],
      correctAnswer: "A graphical representation of the tonal distribution of shadows, midtones, and highlights across the exposure.",
      explanation: "The histogram plots brightness from pure black (left edge) to pure white (right edge), revealing clipped shadows or blown-out highlights.",
    },
    {
      id: "ph_8",
      question: "What is 'White Balance' in photography?",
      options: [
        "Adjusting color temperature to ensure white objects appear neutral white without warm or cool color casts under varying light sources.",
        "Painting the camera body white to reflect sunlight in deserts.",
        "Setting the minimum shutter duration to zero.",
        "Restricting images to high-key white studio backdrops.",
      ],
      correctAnswer: "Adjusting color temperature to ensure white objects appear neutral white without warm or cool color casts under varying light sources.",
      explanation: "Different light sources have different color temperatures (Kelvin). White balance neutralizes color casts so colors look true to life.",
    },
    {
      id: "ph_9",
      question: "What optical effect occurs when using a telephoto lens (e.g. 200mm) compared to a wide-angle lens (e.g. 24mm)?",
      options: [
        "Lens compression: background elements appear closer in size and distance to the foreground subject.",
        "Extreme barrel distortion stretching the corners of the image.",
        "An inverted mirror image flipping left and right.",
        "Complete removal of all background blur.",
      ],
      correctAnswer: "Lens compression: background elements appear closer in size and distance to the foreground subject.",
      explanation: "Telephoto lenses compress perspective, making distant backgrounds appear significantly larger and closer to the foreground subject.",
    },
    {
      id: "ph_10",
      question: "What is the 'Golden Hour' in natural light photography?",
      options: [
        "The period shortly after sunrise or before sunset when the sun is low, casting warm, diffused, and flattering light.",
        "The hour at noon when sunlight is directly overhead.",
        "The time when professional studio rentals are cheapest.",
        "A marketing term for holiday equipment discounts.",
      ],
      correctAnswer: "The period shortly after sunrise or before sunset when the sun is low, casting warm, diffused, and flattering light.",
      explanation: "Low solar angles filter light through more atmosphere, reducing harsh contrast, softening shadows, and producing warm golden hues.",
    },
    {
      id: "ph_11",
      question: "What does the optical term 'bokeh' refer to?",
      options: [
        "The aesthetic quality and character of the out-of-focus background blur produced by a lens.",
        "A Japanese technique for cleaning camera sensors.",
        "The physical glass coating that prevents lens flare.",
        "A camera strap made of organic leather.",
      ],
      correctAnswer: "The aesthetic quality and character of the out-of-focus background blur produced by a lens.",
      explanation: "Derived from the Japanese word for blur ('boke'), bokeh refers to the aesthetic rendering of specular highlights and soft out-of-focus background areas.",
    },
    {
      id: "ph_12",
      question: "What causes 'camera shake' in handheld photography and how is it mitigated?",
      options: [
        "Involuntary hand tremors when shooting at shutter speeds slower than the reciprocal of focal length; mitigated with tripods or image stabilization.",
        "Overheating of the camera internal processor during video recording.",
        "Using memory cards with slow write speeds.",
        "Shooting with zoom lenses in windy conditions only.",
      ],
      correctAnswer: "Involuntary hand tremors when shooting at shutter speeds slower than the reciprocal of focal length; mitigated with tripods or image stabilization.",
      explanation: "The reciprocal rule (e.g. 1/50s minimum for 50mm lens) prevents handheld motion blur; optical image stabilization (OIS) or tripods keep the sensor steady.",
    },
  ],

  "node.js": [
    {
      id: "node_1",
      question: "What is the single-threaded Event Loop in Node.js primarily responsible for?",
      options: [
        "Handling asynchronous I/O callbacks non-blockingly without allocating a new thread per connection.",
        "Compiling JavaScript into C++ binary files at runtime.",
        "Rendering HTML templates in the client browser.",
        "Running multiple simultaneous operating system kernels.",
      ],
      correctAnswer: "Handling asynchronous I/O callbacks non-blockingly without allocating a new thread per connection.",
      explanation: "Node.js uses libuv's single-threaded event loop to coordinate non-blocking network and disk operations efficiently using asynchronous event queues.",
    },
    {
      id: "node_2",
      question: "What is the key difference between `process.nextTick()` and `setImmediate()` in Node.js?",
      options: [
        "`process.nextTick()` callbacks fire immediately after the current operation before the event loop continues; `setImmediate()` queues on the check phase.",
        "`setImmediate()` runs before any synchronous code.",
        "`process.nextTick()` is deprecated and replaced by `setTimeout()`.",
        "There is no difference; they are aliases.",
      ],
      correctAnswer: "`process.nextTick()` callbacks fire immediately after the current operation before the event loop continues; `setImmediate()` queues on the check phase.",
      explanation: "`process.nextTick()` processes its microtask queue before the event loop transitions to any other phase, whereas `setImmediate()` executes in the 'check' phase.",
    },
    {
      id: "node_3",
      question: "Why are Node.js Streams preferred when processing large files (e.g. gigabytes of video or logs)?",
      options: [
        "They process data chunk-by-chunk in memory buffers rather than reading the entire file into RAM at once.",
        "They automatically encrypt files with AES-256.",
        "They convert all file formats into JSON strings.",
        "They bypass the operating system filesystem permissions.",
      ],
      correctAnswer: "They process data chunk-by-chunk in memory buffers rather than reading the entire file into RAM at once.",
      explanation: "Streams read and write sequential chunks of data piece by piece, preventing Node.js heap memory exhaustion on huge payloads.",
    },
    {
      id: "node_4",
      question: "What is the standard callback signature convention in Node.js core modules?",
      options: [
        "Error-first callback: `callback(err, result)`",
        "Result-first callback: `callback(result, err)`",
        "Boolean flag callback: `callback(successBoolean)`",
        "Three-argument callback: `callback(status, code, data)`",
      ],
      correctAnswer: "Error-first callback: `callback(err, result)`",
      explanation: "Node.js follows the error-first pattern: the first parameter is reserved for any Error object (or null if successful), and subsequent arguments hold return data.",
    },
    {
      id: "node_5",
      question: "In CommonJS module format, how do you export functions or objects from a file?",
      options: ["module.exports = { ... }", "export default function()", "export.all = { ... }", "package.exports()"],
      correctAnswer: "module.exports = { ... }",
      explanation: "CommonJS (standard in Node.js `require()` environment) uses `module.exports` or `exports.prop` to expose public APIs.",
    },
    {
      id: "node_6",
      question: "What does the `cluster` module in Node.js allow developers to do?",
      options: [
        "Fork multiple worker child processes sharing the same server port to utilize multi-core CPU architectures.",
        "Connect to a distributed Kubernetes cluster automatically.",
        "Group similar error messages into a single log file.",
        "Merge multiple Git repositories into a monorepo.",
      ],
      correctAnswer: "Fork multiple worker child processes sharing the same server port to utilize multi-core CPU architectures.",
      explanation: "Because Node runs on a single main thread, `cluster` forks child processes that share server ports to distribute load across all available CPU cores.",
    },
    {
      id: "node_7",
      question: "What is the purpose of `package-lock.json` in an npm project?",
      options: [
        "Locks exact versions and dependency trees to ensure deterministic, reproducible builds across environments.",
        "Encrypts the source code to prevent reverse engineering.",
        "Prevents other developers from installing new packages.",
        "Stores environment variable secrets like database passwords.",
      ],
      correctAnswer: "Locks exact versions and dependency trees to ensure deterministic, reproducible builds across environments.",
      explanation: "`package-lock.json` records the exact resolved versions and integrity hashes of every installed dependency, guaranteeing consistent builds.",
    },
    {
      id: "node_8",
      question: "What is a Buffer in Node.js?",
      options: [
        "A class designed to handle raw binary data directly in memory outside the V8 JavaScript heap.",
        "A temporary text file saved in the Windows %TEMP% folder.",
        "A cache that stores HTTP requests for 24 hours.",
        "A tool that slows down API responses to test slow networks.",
      ],
      correctAnswer: "A class designed to handle raw binary data directly in memory outside the V8 JavaScript heap.",
      explanation: "The `Buffer` class represents fixed-length sequences of raw binary bytes allocated outside V8 heap memory, essential for TCP streams and file I/O.",
    },
    {
      id: "node_9",
      question: "What happens if an asynchronous Promise rejects and has no `.catch()` handler or `try...catch` in modern Node.js?",
      options: [
        "An `UnhandledPromiseRejection` occurs and Node.js terminates the process with a non-zero exit code by default.",
        "Node silently suppresses the error and continues running normally.",
        "Node automatically retries the Promise 5 times.",
        "Node reboots the host operating system.",
      ],
      correctAnswer: "An `UnhandledPromiseRejection` occurs and Node.js terminates the process with a non-zero exit code by default.",
      explanation: "In modern Node.js, unhandled promise rejections emit an unhandledRejection event and terminate the process to prevent corrupted states.",
    },
    {
      id: "node_10",
      question: "What does the `EventEmitter` class in Node.js `events` module provide?",
      options: [
        "An implementation of the Publisher-Subscriber (Pub/Sub) pattern with `.on()` to listen and `.emit()` to dispatch events.",
        "A physical timer connected to motherboard audio speakers.",
        "A scheduler that executes cron jobs once a day.",
        "A wrapper around browser DOM event listeners.",
      ],
      correctAnswer: "An implementation of the Publisher-Subscriber (Pub/Sub) pattern with `.on()` to listen and `.emit()` to dispatch events.",
      explanation: "`EventEmitter` is fundamental to Node's architecture: objects (like streams or HTTP servers) inherit from it to trigger named events.",
    },
    {
      id: "node_11",
      question: "How does Node.js achieve non-blocking disk I/O when the operating system does not support true async filesystem calls?",
      options: [
        "By offloading filesystem operations to a background thread pool managed by libuv.",
        "By converting files into WebSocket network frames.",
        "By disabling all disk write verification.",
        "By executing filesystem calls directly on the GPU.",
      ],
      correctAnswer: "By offloading filesystem operations to a background thread pool managed by libuv.",
      explanation: "libuv maintains an internal thread pool (default 4 threads) to perform synchronous blocking filesystem tasks without stalling the main event loop.",
    },
    {
      id: "node_12",
      question: "Which core Node.js module is used to resolve and normalize cross-platform operating system file paths?",
      options: ["path", "fs", "os", "url"],
      correctAnswer: "path",
      explanation: "The `path` module provides cross-platform path utilities (`path.join`, `path.resolve`) handling Windows backslashes (`\\`) and POSIX forward slashes (`/`).",
    },
  ],

  docker: [
    {
      id: "dk_1",
      question: "What is the primary difference between a Docker Image and a Docker Container?",
      options: [
        "An image is a read-only blueprint/template; a container is a running, stateful instance of that image.",
        "An image runs on Linux; a container only runs on Windows.",
        "An image contains the operating system kernel; a container contains only application code.",
        "There is no difference; they are identical terms.",
      ],
      correctAnswer: "An image is a read-only blueprint/template; a container is a running, stateful instance of that image.",
      explanation: "A Docker Image is an immutable snapshot built from a Dockerfile. A Container is an isolated, executable runtime environment instantiated from an image.",
    },
    {
      id: "dk_2",
      question: "In a Dockerfile, what is the difference between `CMD` and `ENTRYPOINT`?",
      options: [
        "`ENTRYPOINT` defines the default executable to run; `CMD` provides default arguments that can be easily overridden on `docker run`.",
        "`CMD` installs packages; `ENTRYPOINT` copies files.",
        "`ENTRYPOINT` runs at image build time; `CMD` runs at container stop time.",
        "`CMD` is only allowed in multi-stage builds.",
      ],
      correctAnswer: "`ENTRYPOINT` defines the default executable to run; `CMD` provides default arguments that can be easily overridden on `docker run`.",
      explanation: "`ENTRYPOINT` sets the command that always executes when container starts. `CMD` supplies default parameters that are replaced if command line args are passed.",
    },
    {
      id: "dk_3",
      question: "What does the `-p 5000:3000` flag mean in `docker run -p 5000:3000 my-image`?",
      options: [
        "It maps host port 5000 to container port 3000.",
        "It maps container port 5000 to host port 3000.",
        "It sets the maximum RAM limit to 5000 MB.",
        "It runs the container in background daemon mode for 3000 seconds.",
      ],
      correctAnswer: "It maps host port 5000 to container port 3000.",
      explanation: "The syntax is `-p <host_port>:<container_port>`. Traffic sent to port 5000 on the host machine is forwarded to port 3000 inside the container.",
    },
    {
      id: "dk_4",
      question: "How do Docker Volumes facilitate data persistence?",
      options: [
        "They store data outside the container's writable layer directly on the host filesystem, surviving container restarts and deletions.",
        "They compress data and upload it to the Docker Hub public registry.",
        "They store data in temporary CPU registers.",
        "They convert database rows into Dockerfile instructions.",
      ],
      correctAnswer: "They store data outside the container's writable layer directly on the host filesystem, surviving container restarts and deletions.",
      explanation: "Containers are ephemeral: when destroyed, their writable layer vanishes. Docker Volumes map storage onto the host, preserving database files across lifecycles.",
    },
    {
      id: "dk_5",
      question: "What is the primary benefit of Multi-Stage Builds in Dockerfiles?",
      options: [
        "Separating the build environment from the production runtime, resulting in vastly smaller, secure final production images.",
        "Running the container across multiple physical cloud providers simultaneously.",
        "Allowing multiple developers to edit the same Dockerfile concurrently.",
        "Preventing all network calls during compilation.",
      ],
      correctAnswer: "Separating the build environment from the production runtime, resulting in vastly smaller, secure final production images.",
      explanation: "Multi-stage builds compile artifacts in an initial heavy builder stage (with compilers/SDKs) and copy only the final binary into a lightweight minimal production image.",
    },
    {
      id: "dk_6",
      question: "What tool allows defining and running multi-container Docker applications using a declarative YAML file?",
      options: ["Docker Compose", "Docker Swarm", "Kubernetes Helm", "Docker Daemon"],
      correctAnswer: "Docker Compose",
      explanation: "Docker Compose uses a `docker-compose.yml` file to configure application services, networks, and persistent volumes in a single coordinated command.",
    },
    {
      id: "dk_7",
      question: "How does Docker layer caching improve build speeds?",
      options: [
        "Docker reuses cached layers for instructions whose commands and copied files haven't changed since the previous build.",
        "Docker downloads pre-built images from random peers on the local LAN.",
        "Docker skips compiling JavaScript files if CPU temperature is normal.",
        "Docker runs all build commands in parallel on the GPU.",
      ],
      correctAnswer: "Docker reuses cached layers for instructions whose commands and copied files haven't changed since the previous build.",
      explanation: "Each line in a Dockerfile creates an image layer. If an instruction and its inputs haven't changed, Docker reuses the existing cached layer instantaneously.",
    },
    {
      id: "dk_8",
      question: "What is the purpose of a `.dockerignore` file?",
      options: [
        "To exclude files and directories (like `node_modules` or `.git`) from being sent to the Docker build context.",
        "To list containers that should never be stopped.",
        "To mute error notifications in the terminal.",
        "To bypass security checks in production containers.",
      ],
      correctAnswer: "To exclude files and directories (like `node_modules` or `.git`) from being sent to the Docker build context.",
      explanation: "Similar to `.gitignore`, `.dockerignore` prevents bloated or sensitive files from being copied into the build daemon context, accelerating builds.",
    },
    {
      id: "dk_9",
      question: "What command stops and removes all containers, networks, and volumes defined in a `docker-compose.yml` file?",
      options: ["docker compose down", "docker compose stop", "docker compose purge", "docker delete all"],
      correctAnswer: "docker compose down",
      explanation: "`docker compose down` halts running services and tears down the networks and containers created by `docker compose up`.",
    },
    {
      id: "dk_10",
      question: "What makes container virtualization more lightweight than traditional hardware virtual machines (VMs)?",
      options: [
        "Containers share the host operating system kernel rather than running a full guest OS with virtualized hardware.",
        "Containers can only execute text scripts.",
        "Containers don't use RAM memory.",
        "Containers must always run in offline airplane mode.",
      ],
      correctAnswer: "Containers share the host operating system kernel rather than running a full guest OS with virtualized hardware.",
      explanation: "VMs run full guest operating systems on hypervisors. Containers share the host kernel and isolate processes using Linux namespaces and cgroups, booting in milliseconds.",
    },
    {
      id: "dk_11",
      question: "What command displays real-time resource usage statistics (CPU, memory, network I/O) for active Docker containers?",
      options: ["docker stats", "docker top", "docker inspect", "docker ps -a"],
      correctAnswer: "docker stats",
      explanation: "`docker stats` provides a live streaming monitor of CPU utilization, memory limits, network I/O, and block I/O for all running containers.",
    },
    {
      id: "dk_12",
      question: "In Docker networking, what is the default network mode assigned to newly started standalone containers?",
      options: ["bridge", "host", "none", "overlay"],
      correctAnswer: "bridge",
      explanation: "Standalone containers default to the `bridge` network driver, which provides internal private IP addresses and software bridge routing to the host network.",
    },
  ],
};

/**
 * Returns whether a skill has an active question bank.
 *
 * @param {string} skillName
 * @returns {boolean}
 */
function hasQuestionBank(skillName) {
  if (!skillName || typeof skillName !== "string") return false;
  const normalized = skillName.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(QUESTION_BANKS, normalized);
}

/**
 * Generates a 10-question quiz for the given skill:
 * - Selects 10 distinct questions randomly from the question bank.
 * - Randomizes the order of answer choices for each question.
 * - Returns the client-safe questions (without correct answers) and the server-side grading key.
 *
 * @param {string} skillName
 * @returns {{ clientQuiz: object, answerKey: Map<string, string> } | null}
 */
function generateQuiz(skillName) {
  if (!skillName || typeof skillName !== "string") return null;
  const normalized = skillName.trim().toLowerCase();
  const bank = QUESTION_BANKS[normalized];

  if (!bank || !Array.isArray(bank) || bank.length < 10) {
    return null;
  }

  // Shuffle questions using Fisher-Yates and pick 10 distinct questions
  const shuffledQuestions = [...bank];
  for (let i = shuffledQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
  }
  const selectedQuestions = shuffledQuestions.slice(0, 10);

  const clientQuestions = [];
  const answerKey = new Map(); // questionId -> { correctAnswer, explanation }

  for (const q of selectedQuestions) {
    // Shuffle options for this question
    const shuffledOptions = [...q.options];
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }

    clientQuestions.push({
      id: q.id,
      question: q.question,
      options: shuffledOptions,
    });

    answerKey.set(q.id, {
      question: q.question,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    });
  }

  return {
    skillName: normalized,
    clientQuestions,
    answerKey,
  };
}

/**
 * Looks up a question by ID within a skill's question bank.
 *
 * @param {string} skillName
 * @param {string} questionId
 * @returns {object | null}
 */
function getQuestionDetails(skillName, questionId) {
  if (!skillName || typeof skillName !== "string" || !questionId) return null;
  const normalized = skillName.trim().toLowerCase();
  const bank = QUESTION_BANKS[normalized];
  if (!bank || !Array.isArray(bank)) return null;
  return bank.find((q) => q.id === questionId) || null;
}

/**
 * Returns a list of all skills that have an active verification question bank.
 *
 * @returns {Array<string>}
 */
function getSupportedSkills() {
  return Object.keys(QUESTION_BANKS);
}

module.exports = {
  QUESTION_BANKS,
  hasQuestionBank,
  generateQuiz,
  getQuestionDetails,
  getSupportedSkills,
};
