/**
 * ============================================================================
 * ADDITIONAL SKILL VERIFICATION QUESTION BANKS
 * ============================================================================
 * Curated, technically accurate question banks for:
 * - Sports: basketball, tennis, chess
 * - Machine Learning: machine learning
 * - Social Sciences: economics, sociology
 * - Psychology: cognitive psychology, psychology
 * - Mathematics: linear algebra, calculus
 *
 * Each question has:
 * - id: Unique string
 * - question: Detailed, clear question text
 * - options: 4 distinct choices
 * - correctAnswer: Exact matching string of correct choice
 * - explanation: Concise rationale for why the answer is correct
 * ============================================================================
 */

const ADDITIONAL_BANKS = {
  // --------------------------------------------------------------------------
  // 1. BASKETBALL (Sports)
  // --------------------------------------------------------------------------
  basketball: [
    {
      id: "bb_1",
      question: "In standard FIBA and NBA rules, how many seconds does an offensive team have on the shot clock to attempt a field goal that hits the rim?",
      options: ["24 seconds", "30 seconds", "35 seconds", "20 seconds"],
      correctAnswer: "24 seconds",
      explanation: "Both NBA and FIBA rules enforce a 24-second shot clock to ensure an active pace of play.",
    },
    {
      id: "bb_2",
      question: "What constitutes a 'traveling' violation in basketball?",
      options: [
        "Moving the pivot foot illegally before releasing the ball on a pass or shot, or taking excessive steps without dribbling.",
        "Dribbling the ball with both hands simultaneously.",
        "Remaining in the key for more than three seconds while on offense.",
        "Touching the ball after it has touched the backboard above the rim level.",
      ],
      correctAnswer: "Moving the pivot foot illegally before releasing the ball on a pass or shot, or taking excessive steps without dribbling.",
      explanation: "Traveling occurs when a player holding the ball moves one or both feet beyond the allowed limits without dribbling.",
    },
    {
      id: "bb_3",
      question: "What is the consequence of an offensive player remaining in the opponent's restricted key area for more than 3 continuous seconds?",
      options: [
        "A 3-second lane violation resulting in turnover of possession to the opposing team.",
        "A technical foul assessed to the player.",
        "One free throw awarded to the defensive team.",
        "A personal shooting foul charged to the center.",
      ],
      correctAnswer: "A 3-second lane violation resulting in turnover of possession to the opposing team.",
      explanation: "The offensive three-second rule prevents players from camping in the paint; violating it results in a turnover.",
    },
    {
      id: "bb_4",
      question: "What is a 'double dribble' violation in basketball?",
      options: [
        "Dribbling with two hands at once, or stopping a dribble and resuming it without losing possession.",
        "Taking two dribbles before crossing half-court.",
        "Dribbling between the legs twice consecutively.",
        "Passing the ball off the backboard back to oneself.",
      ],
      correctAnswer: "Dribbling with two hands at once, or stopping a dribble and resuming it without losing possession.",
      explanation: "A double dribble occurs if a player touches the ball with both hands simultaneously while dribbling, or dribbles, catches the ball, and begins dribbling again.",
    },
    {
      id: "bb_5",
      question: "In basketball defense, what distinguishes a 'zone defense' from a 'man-to-man defense'?",
      options: [
        "In zone defense, each player protects a designated area of the court rather than guarding a specific opponent.",
        "Zone defense requires all five defenders to remain outside the three-point arc.",
        "Man-to-man defense permits defenders to switch offensive players without communication.",
        "Zone defense can only be played in the fourth quarter.",
      ],
      correctAnswer: "In zone defense, each player protects a designated area of the court rather than guarding a specific opponent.",
      explanation: "Zone defense assigns defensive players to territorial zones (e.g. 2-3 or 1-3-1), whereas man-to-man assigns each defender to shadow an individual offensive player.",
    },
    {
      id: "bb_6",
      question: "What is the point value awarded for a successful free throw shot in basketball?",
      options: ["1 point", "2 points", "3 points", "0.5 points"],
      correctAnswer: "1 point",
      explanation: "Every successful free throw counts as exactly 1 point on the scoreboard.",
    },
    {
      id: "bb_7",
      question: "When does 'goaltending' occur during a field goal attempt?",
      options: [
        "When a defender touches the ball while it is on its downward flight toward the basket and completely above the rim level.",
        "When a defender blocks a shot on its initial upward trajectory.",
        "When a defender strips the ball cleanly before the shooter leaves the ground.",
        "When an offensive player grabs an offensive rebound after the ball leaves the rim.",
      ],
      correctAnswer: "When a defender touches the ball while it is on its downward flight toward the basket and completely above the rim level.",
      explanation: "Goaltending occurs if a player touches the ball while it is on its downward arc toward the basket and has a chance of entering, or while resting on the rim flange.",
    },
    {
      id: "bb_8",
      question: "What is an offensive 'pick and roll' (screen and roll) maneuver?",
      options: [
        "An offensive player sets a stationary screen on a teammate's defender, then cuts ('rolls') toward the basket for a pass.",
        "A player fakes a pass to the perimeter and drives along the baseline.",
        "A defensive switch where two defenders trap the ball handler.",
        "A fast break technique involving three sequential bounce passes.",
      ],
      correctAnswer: "An offensive player sets a stationary screen on a teammate's defender, then cuts ('rolls') toward the basket for a pass.",
      explanation: "The pick-and-roll involves a screener who blocks the ball-handler's defender, then moves swiftly toward the hoop to receive an interior pass.",
    },
    {
      id: "bb_9",
      question: "How many seconds does an offensive team have to advance the ball across the midcourt line into the frontcourt?",
      options: ["8 seconds (NBA/FIBA) or 10 seconds (NCAA men's)", "5 seconds", "12 seconds", "15 seconds"],
      correctAnswer: "8 seconds (NBA/FIBA) or 10 seconds (NCAA men's)",
      explanation: "NBA and FIBA require advancing past midcourt within 8 seconds; NCAA men's allows 10 seconds.",
    },
    {
      id: "bb_10",
      question: "What is a 'backcourt violation' in basketball?",
      options: [
        "Once an offensive team establishes frontcourt possession, touching or passing the ball into the backcourt where an offensive player retrieves it.",
        "Fouling a player behind the three-point line.",
        "Shooting an airball from beyond half-court.",
        "Stepping out of bounds on the baseline while inbounding.",
      ],
      correctAnswer: "Once an offensive team establishes frontcourt possession, touching or passing the ball into the backcourt where an offensive player retrieves it.",
      explanation: "Once the offensive team has established possession in their frontcourt, they cannot return the ball to the backcourt without a defensive deflection.",
    },
    {
      id: "bb_11",
      question: "What is the standard height of an official regulation basketball rim from the floor?",
      options: ["10 feet (3.05 meters)", "9.5 feet (2.90 meters)", "10.5 feet (3.20 meters)", "11 feet (3.35 meters)"],
      correctAnswer: "10 feet (3.05 meters)",
      explanation: "Regulation basketball hoops at high school, college, and professional levels are positioned exactly 10 feet (3.048 m) above the playing surface.",
    },
    {
      id: "bb_12",
      question: "What is the difference between a technical foul and a personal foul?",
      options: [
        "A personal foul involves illegal physical contact with an opponent during play; a technical foul penalizes unsportsmanlike conduct or administrative infractions.",
        "A technical foul can only be called on head coaches.",
        "Personal fouls always award two free throws plus possession.",
        "A technical foul counts toward a player's six allowed personal fouls in the NBA.",
      ],
      correctAnswer: "A personal foul involves illegal physical contact with an opponent during play; a technical foul penalizes unsportsmanlike conduct or administrative infractions.",
      explanation: "Personal fouls address illegal player-to-player physical contact; technical fouls address behavioral issues, excessive arguing, delay of game, or bench infractions.",
    },
  ],

  // --------------------------------------------------------------------------
  // 2. TENNIS (Sports)
  // --------------------------------------------------------------------------
  tennis: [
    {
      id: "tn_1",
      question: "In traditional tennis scoring, what is the term used when a game reaches a score of 40-40?",
      options: ["Deuce", "Tiebreak", "Advantage", "Break point"],
      correctAnswer: "Deuce",
      explanation: "A tied score of 40-40 is called 'deuce'. A player must win two consecutive points from deuce to win the game.",
    },
    {
      id: "tn_2",
      question: "Which grip is universally recommended for executing serves, overhead smashes, and volleys in modern tennis?",
      options: ["Continental grip", "Western grip", "Eastern forehand grip", "Semi-Western grip"],
      correctAnswer: "Continental grip",
      explanation: "The Continental grip (bevel 2) allows natural pronation of the forearm and wrist for serves, overheads, slices, and volleys.",
    },
    {
      id: "tn_3",
      question: "What occurs when a served tennis ball clips the net cord but lands squarely inside the correct service box?",
      options: [
        "A 'let' is called, and the server replays that particular serve without penalty.",
        "A service fault is charged to the server.",
        "The receiving player is awarded the point immediately.",
        "Play continues and the receiver must return the ball.",
      ],
      correctAnswer: "A 'let' is called, and the server replays that particular serve without penalty.",
      explanation: "Under traditional rules, a net-cord contact on a serve that lands in the target service box is called a 'let' and replayed.",
    },
    {
      id: "tn_4",
      question: "In a standard 7-point tennis tiebreak, what condition must be met to win the tiebreak set?",
      options: [
        "A player must reach at least 7 points with a margin of at least 2 points over their opponent.",
        "First player to win exactly 7 points regardless of margin.",
        "A player must win 10 points with a 1-point margin.",
        "First player to win 4 consecutive points from 6-6.",
      ],
      correctAnswer: "A player must reach at least 7 points with a margin of at least 2 points over their opponent.",
      explanation: "A standard tiebreak is won by the first player to win at least 7 points and lead by two or more points (e.g. 7-5, 8-6, 9-7).",
    },
    {
      id: "tn_5",
      question: "What physical racket swing path produces 'topspin' on a tennis groundstroke?",
      options: [
        "A low-to-high swing trajectory where the racket face brushes upward across the back of the ball.",
        "A high-to-low swing path chopping down through the bottom of the ball.",
        "A strictly horizontal flat push across the baseline.",
        "A downward chop with a completely open racket face.",
      ],
      correctAnswer: "A low-to-high swing trajectory where the racket face brushes upward across the back of the ball.",
      explanation: "Topspin is created by brushing the strings upward against the back of the ball from below contact point to above it, creating forward rotation and aerodynamic Magnus downward force.",
    },
    {
      id: "tn_6",
      question: "What is a 'foot fault' during a tennis serve?",
      options: [
        "The server steps on or over the baseline before their racket makes contact with the ball.",
        "The server slides their back foot while tossing the ball.",
        "The receiver steps inside the baseline before the serve is struck.",
        "The server stands with both feet airborne during the toss.",
      ],
      correctAnswer: "The server steps on or over the baseline before their racket makes contact with the ball.",
      explanation: "A foot fault occurs when the server touches the court surface on or inside the baseline or across imaginary center/sideline marks before hitting the ball.",
    },
    {
      id: "tn_7",
      question: "What is the result when a server misses both their first and second serve attempts in a single point?",
      options: [
        "A 'double fault' is called, and the receiver automatically wins the point.",
        "The server is granted a reserve third serve.",
        "The score returns to love-all.",
        "A let is declared and the game is restarted.",
      ],
      correctAnswer: "A 'double fault' is called, and the receiver automatically wins the point.",
      explanation: "Failing to land both the first and second serves into the correct service box constitutes a double fault and forfeits the point to the receiver.",
    },
    {
      id: "tn_8",
      question: "Which Grand Slam tournament is traditionally contested on natural grass courts?",
      options: ["Wimbledon (The Championships)", "The French Open (Roland Garros)", "The Australian Open", "The US Open"],
      correctAnswer: "Wimbledon (The Championships)",
      explanation: "Wimbledon is the only Grand Slam tournament played on natural grass. Roland Garros is clay; Australian Open and US Open are hard courts.",
    },
    {
      id: "tn_9",
      question: "What does the term 'break point' mean in tennis match commentary?",
      options: [
        "A point where, if the receiving player wins it, they will win their opponent's service game.",
        "A point where the server can win the entire match.",
        "The moment a player's racket string snaps during play.",
        "The mandatory 90-second medical evaluation interval.",
      ],
      correctAnswer: "A point where, if the receiving player wins it, they will win their opponent's service game.",
      explanation: "A break point occurs when the receiver is one point away from winning a game served by the opponent (breaking serve).",
    },
    {
      id: "tn_10",
      question: "How does backspin ('slice') affect the bounce and flight trajectory of a tennis ball?",
      options: [
        "It causes the ball to stay low upon bouncing and float through the air with reduced forward pace.",
        "It causes the ball to bounce exceptionally high with aggressive forward acceleration.",
        "It eliminates all curve and forces a straight trajectory.",
        "It makes the ball rebound backwards across the net on every bounce.",
      ],
      correctAnswer: "It causes the ball to stay low upon bouncing and float through the air with reduced forward pace.",
      explanation: "Backspin generates upward aerodynamic lift in flight and bites into the court on impact, producing a low, skidding bounce.",
    },
    {
      id: "tn_11",
      question: "How wide are the 'doubles alleys' on each side of a regulation tennis court?",
      options: ["4.5 feet (1.37 meters)", "3.0 feet (0.91 meters)", "6.0 feet (1.83 meters)", "2.0 feet (0.61 meters)"],
      correctAnswer: "4.5 feet (1.37 meters)",
      explanation: "Singles court width is 27 feet (8.23 m), and doubles width is 36 feet (10.97 m). The extra 9 feet is split into two 4.5-foot alleys.",
    },
    {
      id: "tn_12",
      question: "When players change ends of the court during a standard set, when does the changeover occur?",
      options: [
        "After the 1st, 3rd, 5th, and every subsequent odd-numbered game in the set.",
        "After every even-numbered game (2, 4, 6...).",
        "Only when one player reaches 6 games.",
        "Every 10 minutes according to the stadium clock.",
      ],
      correctAnswer: "After the 1st, 3rd, 5th, and every subsequent odd-numbered game in the set.",
      explanation: "Players change sides after the first game and after every two games thereafter (all odd sum of games: 1, 3, 5, 7, etc.).",
    },
  ],

  // --------------------------------------------------------------------------
  // 3. CHESS (Sports / Strategy)
  // --------------------------------------------------------------------------
  chess: [
    {
      id: "ch_1",
      question: "Under what specific condition is the special pawn capture rule 'en passant' permitted in chess?",
      options: [
        "Immediately on the very next turn after an opponent advances a pawn two squares forward and lands adjacent to your pawn.",
        "Anytime an opponent's pawn enters your back rank.",
        "Only when your king is under check.",
        "Whenever a pawn captures any piece backwards diagonally.",
      ],
      correctAnswer: "Immediately on the very next turn after an opponent advances a pawn two squares forward and lands adjacent to your pawn.",
      explanation: "En passant must be exercised immediately on the next move after an opponent's pawn moves two squares from its starting rank and lands horizontally adjacent.",
    },
    {
      id: "ch_2",
      question: "Which of the following conditions prevents a player from castling in chess?",
      options: [
        "The king has previously moved, or the king currently sits in or must pass through check.",
        "The opponent has more pieces remaining on the board.",
        "The rook is currently under attack by an enemy knight.",
        "A pawn has already been promoted earlier in the game.",
      ],
      correctAnswer: "The king has previously moved, or the king currently sits in or must pass through check.",
      explanation: "Castling is illegal if the king has moved, if the involved rook has moved, if pieces intervene, or if the king starts in, passes through, or lands in check.",
    },
    {
      id: "ch_3",
      question: "What is the outcome of a chess game if a player on move has no legal moves available, but their king is NOT currently in check?",
      options: [
        "Stalemate, resulting in an immediate draw (tie).",
        "Checkmate, resulting in a victory for the opponent.",
        "Forfeit, resulting in a loss of points.",
        "A 3-move penalty where the opponent moves twice.",
      ],
      correctAnswer: "Stalemate, resulting in an immediate draw (tie).",
      explanation: "When a player on turn has no legal moves and their king is not in check, the game ends in stalemate, scored as a half-point draw for each player.",
    },
    {
      id: "ch_4",
      question: "In chess tactics, what is a 'fork'?",
      options: [
        "A single piece simultaneously attacks two or more enemy pieces at the same time.",
        "An attack on a valuable piece that forces it to move and expose a piece behind it.",
        "Trapping the enemy king along the edge of the board with a rook.",
        "Sacrificing a queen to force an open file.",
      ],
      correctAnswer: "A single piece simultaneously attacks two or more enemy pieces at the same time.",
      explanation: "A fork occurs when one attacking piece (most notoriously a knight or pawn) attacks multiple opponent targets simultaneously.",
    },
    {
      id: "ch_5",
      question: "What is the difference between a 'pin' and a 'skewer' in chess tactics?",
      options: [
        "In a pin, the more valuable piece is behind the attacked piece; in a skewer, the more valuable piece is in front and must move.",
        "Pins can only be executed by knights; skewers can only be executed by pawns.",
        "Pins result in immediate checkmate; skewers result in draws.",
        "A pin attacks diagonally; a skewer attacks only vertically.",
      ],
      correctAnswer: "In a pin, the more valuable piece is behind the attacked piece; in a skewer, the more valuable piece is in front and must move.",
      explanation: "In a pin, a lower-value piece shields a higher-value piece (e.g. king or queen). In a skewer, the higher-value piece is attacked directly and forced to move, exposing the piece behind it.",
    },
    {
      id: "ch_6",
      question: "In standard chess piece evaluation conventions, what are the relative point values of Pawn, Knight, Bishop, Rook, and Queen?",
      options: [
        "Pawn = 1, Knight = 3, Bishop = 3, Rook = 5, Queen = 9",
        "Pawn = 1, Knight = 2, Bishop = 4, Rook = 6, Queen = 10",
        "Pawn = 1, Knight = 3, Bishop = 5, Rook = 7, Queen = 12",
        "Pawn = 2, Knight = 3, Bishop = 3, Rook = 4, Queen = 8",
      ],
      correctAnswer: "Pawn = 1, Knight = 3, Bishop = 3, Rook = 5, Queen = 9",
      explanation: "Standard material values are 1 point for a pawn, 3 for knights and bishops, 5 for rooks, and 9 for queens.",
    },
    {
      id: "ch_7",
      question: "What does 'Fianchetto' mean in chess opening theory?",
      options: [
        "Developing a bishop to b2/g2 (for White) or b7/g7 (for Black) onto the long central diagonal.",
        "Moving the d and e pawns forward two squares simultaneously.",
        "Swapping queens within the first four moves of the game.",
        "Sacrificing a rook for active piece play in the center.",
      ],
      correctAnswer: "Developing a bishop to b2/g2 (for White) or b7/g7 (for Black) onto the long central diagonal.",
      explanation: "A fianchetto involves advancing a knight-pawn (b3/g3 or b6/g6) and placing the bishop on the opened long diagonal (b2/g2 or b7/g7).",
    },
    {
      id: "ch_8",
      question: "What is the '50-move rule' in competitive chess?",
      options: [
        "A player can claim a draw if 50 consecutive moves occur by each player without any pawn move or piece capture.",
        "The game automatically ends after 50 total moves.",
        "Each player is allotted exactly 50 moves per clock hour.",
        "A king must be mated within 50 moves of an opening.",
      ],
      correctAnswer: "A player can claim a draw if 50 consecutive moves occur by each player without any pawn move or piece capture.",
      explanation: "The 50-move rule allows either player to claim a draw if 50 full moves pass without a capture or pawn advance.",
    },
    {
      id: "ch_9",
      question: "What is a 'discovered check' in chess?",
      options: [
        "A piece moves out of the way, unmasking an attack on the enemy king from a friendly piece behind it.",
        "The king moves adjacent to an enemy piece without realizing it.",
        "A check delivered by an en passant pawn capture.",
        "A surprise check delivered from the back rank during promotion.",
      ],
      correctAnswer: "A piece moves out of the way, unmasking an attack on the enemy king from a friendly piece behind it.",
      explanation: "Discovered check occurs when moving one piece uncovers an attack on the opponent's king from a line piece (queen, rook, or bishop) stationed behind it.",
    },
    {
      id: "ch_10",
      question: "When a pawn reaches the eighth rank (furthest opposite rank), which pieces can it be promoted to?",
      options: [
        "Queen, Rook, Bishop, or Knight of the same color.",
        "Only the Queen.",
        "Any piece that has previously been captured by the opponent.",
        "Any piece including an additional King.",
      ],
      correctAnswer: "Queen, Rook, Bishop, or Knight of the same color.",
      explanation: "A pawn reaching the opposite end must be immediately converted into a Queen, Rook, Bishop, or Knight of the same color, regardless of what pieces remain on the board.",
    },
    {
      id: "ch_11",
      question: "What is the 'touch-move' rule enforced in over-the-board tournament chess?",
      options: [
        "If a player intentionally touches a piece, they must move it if it has a legal move; touching an opponent's piece mandates capturing it if legal.",
        "Players must touch their clock immediately after moving.",
        "Players may touch and adjust pieces without announcing anything.",
        "A player must make their move within 5 seconds of touching a piece.",
      ],
      correctAnswer: "If a player intentionally touches a piece, they must move it if it has a legal move; touching an opponent's piece mandates capturing it if legal.",
      explanation: "The touch-move rule mandates that a player who deliberately touches one of their pieces must move it if possible, unless they explicitly stated 'J'adoube' / 'I adjust' beforehand.",
    },
    {
      id: "ch_12",
      question: "What is the strategic objective of controlling the four central squares (d4, d5, e4, e5) during the opening phase?",
      options: [
        "It provides maximum mobility for friendly pieces and restricts the opponent's counterplay and piece relocation across the board.",
        "It guarantees an immediate win on move 10.",
        "It is required by FIDE rules before castling is permitted.",
        "It forces an automatic exchange of both queens.",
      ],
      correctAnswer: "It provides maximum mobility for friendly pieces and restricts the opponent's counterplay and piece relocation across the board.",
      explanation: "Central control allows pieces to project power across both flanks quickly, secures outpost squares, and cramps enemy maneuverability.",
    },
  ],

  // --------------------------------------------------------------------------
  // 4. MACHINE LEARNING (Technology & Computer Science)
  // --------------------------------------------------------------------------
  "machine learning": [
    {
      id: "ml_1",
      question: "What is the primary difference between Supervised Learning and Unsupervised Learning?",
      options: [
        "Supervised learning trains on labeled input-output pairs; unsupervised learning finds intrinsic patterns in unlabeled data.",
        "Supervised learning only works on images; unsupervised learning works on numbers.",
        "Supervised learning does not use loss functions; unsupervised learning requires human grading.",
        "Supervised learning requires quantum processors; unsupervised learning runs on standard CPUs.",
      ],
      correctAnswer: "Supervised learning trains on labeled input-output pairs; unsupervised learning finds intrinsic patterns in unlabeled data.",
      explanation: "Supervised algorithms learn a mapping from labeled examples $(x, y)$, whereas unsupervised algorithms uncover structure, clusters, or representations from features $x$ alone.",
    },
    {
      id: "ml_2",
      question: "What characterizes an 'overfitted' machine learning model?",
      options: [
        "Exceptionally low error on the training set, but high generalization error on unseen test/validation data.",
        "High error on both training and test data due to an overly simplistic model architecture.",
        "A model that requires too little compute memory during training.",
        "A model with zero parameters and only hardcoded heuristics.",
      ],
      correctAnswer: "Exceptionally low error on the training set, but high generalization error on unseen test/validation data.",
      explanation: "Overfitting occurs when a model memorizes noise and idiosyncrasies of the training dataset, destroying its ability to generalize to new data.",
    },
    {
      id: "ml_3",
      question: "What is the fundamental difference between L1 Regularization (Lasso) and L2 Regularization (Ridge)?",
      options: [
        "L1 adds the absolute sum of weights and promotes sparse feature selection; L2 adds the squared sum of weights and penalizes large coefficients evenly.",
        "L1 doubles the learning rate, while L2 reduces the dataset size.",
        "L1 only applies to neural networks, while L2 only applies to decision trees.",
        "L1 eliminates negative weights, while L2 eliminates positive weights.",
      ],
      correctAnswer: "L1 adds the absolute sum of weights and promotes sparse feature selection; L2 adds the squared sum of weights and penalizes large coefficients evenly.",
      explanation: "L1 regularization ($\lambda \sum |w|$) drives non-essential weights to exactly zero (sparse models), whereas L2 ($\lambda \sum w^2$) shrinks weights continuously toward zero without forcing strict sparsity.",
    },
    {
      id: "ml_4",
      question: "In classification evaluation, what is the definition of 'Recall' (also known as Sensitivity)?",
      options: [
        "True Positives divided by (True Positives + False Negatives)",
        "True Positives divided by (True Positives + False Positives)",
        "(True Positives + True Negatives) divided by Total Samples",
        "False Positives divided by (True Negatives + False Positives)",
      ],
      correctAnswer: "True Positives divided by (True Positives + False Negatives)",
      explanation: "Recall measures the proportion of actual positive instances correctly identified by the model: $TP / (TP + FN)$.",
    },
    {
      id: "ml_5",
      question: "Why is the Rectified Linear Unit (ReLU) activation function widely preferred over the Sigmoid function in deep neural networks?",
      options: [
        "ReLU mitigates the vanishing gradient problem for positive inputs and is computationally fast to evaluate ($max(0, x)$).",
        "ReLU bounds outputs strictly between -1 and +1.",
        "ReLU guarantees that all neurons will activate simultaneously.",
        "ReLU prevents all forms of model overfitting automatically.",
      ],
      correctAnswer: "ReLU mitigates the vanishing gradient problem for positive inputs and is computationally fast to evaluate ($max(0, x)$).",
      explanation: "Sigmoids saturate at 0 and 1 with tiny derivatives, causing vanishing gradients in deep networks. ReLU maintains a derivative of 1 for $x > 0$, enabling effective backpropagation.",
    },
    {
      id: "ml_6",
      question: "What purpose does k-fold cross-validation serve in a machine learning workflow?",
      options: [
        "It provides a robust, low-variance estimate of model performance across k distinct train/test splits of the data.",
        "It compresses the size of the neural network by a factor of k.",
        "It automatically cleans missing values from tabular datasets.",
        "It replaces the need to specify hyperparameters.",
      ],
      correctAnswer: "It provides a robust, low-variance estimate of model performance across k distinct train/test splits of the data.",
      explanation: "K-fold cross-validation splits data into $k$ equal subsets, iteratively training on $k-1$ folds and validating on the remaining fold to reliably assess model generalization.",
    },
    {
      id: "ml_7",
      question: "What does the 'learning rate' parameter control during Gradient Descent optimization?",
      options: [
        "The step size taken in the direction of the negative gradient at each optimization iteration.",
        "The number of epochs the model is trained for.",
        "The percentage of features dropped during random dropout.",
        "The speed at which dataset files are loaded from disk.",
      ],
      correctAnswer: "The step size taken in the direction of the negative gradient at each optimization iteration.",
      explanation: "The learning rate $\alpha$ scales the gradient updates ($w \leftarrow w - \alpha \nabla L$); too large risks divergence, while too small causes agonizingly slow convergence.",
    },
    {
      id: "ml_8",
      question: "In unsupervised learning, how does the K-Means clustering algorithm assign data points to clusters?",
      options: [
        "Points are assigned to the cluster whose centroid has the minimum Euclidean (or squared) distance to the point.",
        "Points are grouped based on supervised classification labels.",
        "Points are arranged into a binary decision tree by maximum information gain.",
        "Points are ordered alphabetically by their feature column headers.",
      ],
      correctAnswer: "Points are assigned to the cluster whose centroid has the minimum Euclidean (or squared) distance to the point.",
      explanation: "K-Means alternates between assigning points to the nearest cluster centroid by distance and recomputing centroids as the mean of assigned points until convergence.",
    },
    {
      id: "ml_9",
      question: "What is 'data leakage' (or target leakage) in machine learning and why is it dangerous?",
      options: [
        "Information from the test or target label inadvertently enters training features, yielding deceptively high training metrics that fail in production.",
        "An unauthorized hacker downloading customer records from a database.",
        "RAM memory being exhausted by large matrix tensors during training.",
        "Overwriting a CSV dataset file with null values.",
      ],
      correctAnswer: "Information from the test or target label inadvertently enters training features, yielding deceptively high training metrics that fail in production.",
      explanation: "Data leakage occurs when training data includes features that contain future or ground-truth information unavailable during actual production inference.",
    },
    {
      id: "ml_10",
      question: "What does an ROC-AUC score of 0.5 indicate for a binary classification model?",
      options: [
        "The model performs no better than random guessing.",
        "The model achieves perfect separation between classes.",
        "The model has exactly 50% false positives and 0% true positives.",
        "The model is 100% overfitted to the training set.",
      ],
      correctAnswer: "The model performs no better than random guessing.",
      explanation: "An Area Under the ROC Curve (AUC) of 0.5 represents a completely uninformative model whose predictions are equivalent to flipping an unbiased coin.",
    },
    {
      id: "ml_11",
      question: "What problem do ensemble methods like Random Forests solve compared to a single Decision Tree?",
      options: [
        "They aggregate predictions across many decorrelated trees, substantially reducing variance and preventing overfitting.",
        "They eliminate the need to split nodes based on Gini impurity.",
        "They allow decision trees to process unstructured raw audio directly.",
        "They guarantee zero training loss on any dataset.",
      ],
      correctAnswer: "They aggregate predictions across many decorrelated trees, substantially reducing variance and preventing overfitting.",
      explanation: "Single decision trees are prone to high variance. Random Forests use bagging (bootstrap aggregation) and feature subsetting to average many trees, reducing variance while maintaining low bias.",
    },
    {
      id: "ml_12",
      question: "What is the primary role of the 'Softmax' function when applied to the output logits of a multi-class neural network?",
      options: [
        "It normalizes raw logit scores into a valid probability distribution where all values are positive and sum to 1.",
        "It zeroes out negative weights to speed up inference.",
        "It computes the derivative of the weights with respect to the loss function.",
        "It compresses high-dimensional images into two-dimensional vectors.",
      ],
      correctAnswer: "It normalizes raw logit scores into a valid probability distribution where all values are positive and sum to 1.",
      explanation: "Softmax exponentiates raw logits and divides each by the sum of all exponentiated values ($\frac{e^{z_i}}{\sum e^{z_j}}$), yielding interpretable probabilities that sum to 1.",
    },
  ],

  // --------------------------------------------------------------------------
  // 5. ECONOMICS (Social Sciences)
  // --------------------------------------------------------------------------
  economics: [
    {
      id: "ec_1",
      question: "According to the Law of Demand, what typically happens to the quantity demanded of a good when its price increases, ceteris paribus?",
      options: [
        "The quantity demanded decreases.",
        "The quantity demanded increases proportionally.",
        "The demand curve shifts completely to the right.",
        "The quantity supplied drops to zero.",
      ],
      correctAnswer: "The quantity demanded decreases.",
      explanation: "The Law of Demand states that, all else being equal, as the price of a good rises, consumers purchase less of it due to substitution and income effects.",
    },
    {
      id: "ec_2",
      question: "What is 'opportunity cost' in economic decision-making?",
      options: [
        "The value of the next best alternative forgone when a choice is made.",
        "The total financial expense incurred in launching a new business.",
        "The monetary cost of borrowed capital from banks.",
        "The legal penalty for defaulting on commercial contracts.",
      ],
      correctAnswer: "The value of the next best alternative forgone when a choice is made.",
      explanation: "Opportunity cost represents the benefit or value an individual or firm misses out on when choosing one alternative over another.",
    },
    {
      id: "ec_3",
      question: "If a good has a price elasticity of demand greater than 1 ($|E_d| > 1$), how is its demand categorized?",
      options: ["Elastic", "Inelastic", "Unit elastic", "Perfectively inelastic"],
      correctAnswer: "Elastic",
      explanation: "Demand is price elastic when the percentage change in quantity demanded exceeds the percentage change in price ($|E_d| > 1$).",
    },
    {
      id: "ec_4",
      question: "What components constitute Gross Domestic Product (GDP) using the expenditure approach ($Y = C + I + G + NX$)?",
      options: [
        "Consumption + Investment + Government Spending + Net Exports (Exports minus Imports)",
        "Capital + Inflation + Growth + Net Taxation",
        "Corporate Profits + Interest + Government Debt + National Output",
        "Consumer Spending + Import Tariffs + Gross Revenue + Exports",
      ],
      correctAnswer: "Consumption + Investment + Government Spending + Net Exports (Exports minus Imports)",
      explanation: "The expenditure approach calculates GDP as the sum of private consumption ($C$), gross private investment ($I$), government spending ($G$), and net exports ($NX = X - M$).",
    },
    {
      id: "ec_5",
      question: "What is the principal difference between 'Fiscal Policy' and 'Monetary Policy'?",
      options: [
        "Fiscal policy is conducted by government through taxation and public spending; monetary policy is managed by central banks through interest rates and money supply.",
        "Fiscal policy only applies to commercial banks, while monetary policy applies to consumers.",
        "Monetary policy involves setting corporate tax rates, while fiscal policy sets currency exchange pegs.",
        "Fiscal policy is international; monetary policy is municipal.",
      ],
      correctAnswer: "Fiscal policy is conducted by government through taxation and public spending; monetary policy is managed by central banks through interest rates and money supply.",
      explanation: "Fiscal policy refers to government budget decisions (taxes and expenditure), whereas monetary policy refers to central bank controls over liquidity, interest rates, and bank reserves.",
    },
    {
      id: "ec_6",
      question: "What is an economic 'externality'?",
      options: [
        "A cost or benefit imposed on a third party who did not choose to incur that cost or benefit (e.g. pollution or vaccination).",
        "A tariff charged on goods manufactured overseas.",
        "A foreign currency exchange surcharge levied at borders.",
        "An unexpected increase in corporate executive bonuses.",
      ],
      correctAnswer: "A cost or benefit imposed on a third party who did not choose to incur that cost or benefit (e.g. pollution or vaccination).",
      explanation: "An externality is a side effect of an economic transaction affecting uninvolved third parties; negative externalities impose costs (pollution), while positive ones confer benefits (herd immunity).",
    },
    {
      id: "ec_7",
      question: "What does David Ricardo's principle of 'Comparative Advantage' demonstrate in international trade?",
      options: [
        "Countries benefit by specializing in producing goods for which they hold the lowest opportunity cost, even if one country has an absolute advantage in all goods.",
        "Countries should only import goods when domestic currency value is falling.",
        "The wealthiest nation should produce all manufactured goods globally.",
        "Tariffs always increase domestic consumer welfare.",
      ],
      correctAnswer: "Countries benefit by specializing in producing goods for which they hold the lowest opportunity cost, even if one country has an absolute advantage in all goods.",
      explanation: "Comparative advantage proves that trade allows mutually beneficial specialization when entities produce where their opportunity cost is lowest.",
    },
    {
      id: "ec_8",
      question: "What market structure is characterized by a single seller, significant barriers to entry, and price-setting power?",
      options: ["Monopoly", "Monopolistic competition", "Perfect competition", "Oligopsony"],
      correctAnswer: "Monopoly",
      explanation: "A monopoly exists when a single supplier controls the market for a good with no close substitutes, shielded by high barriers to entry.",
    },
    {
      id: "ec_9",
      question: "What does the 'Law of Diminishing Marginal Returns' state in production economics?",
      options: [
        "Adding more of one variable input (e.g. labor) while holding others fixed eventually yields progressively smaller increases in output.",
        "Total profits always decrease as production scales upward.",
        "Consumer satisfaction always turns negative after purchasing two items.",
        "Machines depreciate faster when operated continuously.",
      ],
      correctAnswer: "Adding more of one variable input (e.g. labor) while holding others fixed eventually yields progressively smaller increases in output.",
      explanation: "As additional units of a variable factor are added to fixed capital, the marginal product of the variable factor eventually declines.",
    },
    {
      id: "ec_10",
      question: "What is 'Consumer Surplus'?",
      options: [
        "The difference between the maximum price a consumer is willing to pay and the actual price they pay.",
        "Excess unsold inventory accumulated by retailers.",
        "The sales tax collected by governments on consumer purchases.",
        "The profit margin earned by producers on luxury goods.",
      ],
      correctAnswer: "The difference between the maximum price a consumer is willing to pay and the actual price they pay.",
      explanation: "Consumer surplus measures economic benefit to consumers, quantified as willingness to pay minus market equilibrium price.",
    },
    {
      id: "ec_11",
      question: "What is 'Stagflation' in macroeconomic terms?",
      options: [
        "A combination of stagnant economic growth, high unemployment, and high inflation.",
        "Rapid economic growth coupled with zero inflation.",
        "A severe drop in stock market indices over three consecutive trading days.",
        "A currency devaluation caused by balanced government budgets.",
      ],
      correctAnswer: "A combination of stagnant economic growth, high unemployment, and high inflation.",
      explanation: "Stagflation occurs when an economy experiences slow economic growth (stagnation) alongside elevated unemployment and persistent inflation.",
    },
    {
      id: "ec_12",
      question: "How is the Consumer Price Index (CPI) typically used in an economy?",
      options: [
        "To track changes in the price level of a representative basket of consumer goods and services over time, measuring inflation.",
        "To calculate total annual corporate dividends paid to shareholders.",
        "To determine commercial loan interest rates charged by credit unions.",
        "To measure total imports arriving through sea freight ports.",
      ],
      correctAnswer: "To track changes in the price level of a representative basket of consumer goods and services over time, measuring inflation.",
      explanation: "CPI tracks price changes in a market basket of goods and services purchased by urban consumers, serving as the benchmark gauge for inflation and cost of living adjustments.",
    },
  ],

  // --------------------------------------------------------------------------
  // 6. SOCIOLOGY (Social Sciences)
  // --------------------------------------------------------------------------
  sociology: [
    {
      id: "soc_1",
      question: "What concept did C. Wright Mills define as the ability to understand the intersection between personal biographies and larger historical/social structures?",
      options: ["The Sociological Imagination", "Social Darwinism", "Structural Determinism", "Symbolic Rationalism"],
      correctAnswer: "The Sociological Imagination",
      explanation: "Mills defined the sociological imagination as the awareness of the relationship between individual experience ('personal troubles') and wider society ('public issues').",
    },
    {
      id: "soc_2",
      question: "Which major sociological perspective views society as a complex system whose parts work together to promote solidarity, order, and stability?",
      options: ["Structural Functionalism", "Conflict Theory", "Symbolic Interactionism", "Postmodern Deconstruction"],
      correctAnswer: "Structural Functionalism",
      explanation: "Structural functionalism (associated with Durkheim and Parsons) looks at society as an organism where social institutions fulfill essential functions for stability.",
    },
    {
      id: "soc_3",
      question: "What is the primary focus of Karl Marx's Conflict Theory in sociology?",
      options: [
        "Society is divided into social classes competing over scarce economic resources and power, driving historical change.",
        "Society functions harmoniously through shared moral consensus.",
        "Face-to-face micro-interactions define how individuals interpret symbols.",
        "Biological instincts dictate social hierarchy.",
      ],
      correctAnswer: "Society is divided into social classes competing over scarce economic resources and power, driving historical change.",
      explanation: "Marx's conflict theory emphasizes tensions and struggle between social classes (the bourgeoisie and the proletariat) over ownership of production and distribution of wealth.",
    },
    {
      id: "soc_4",
      question: "What is 'anomie' as conceptualized by French sociologist Émile Durkheim?",
      options: [
        "A state of normlessness and breakdown of social rules that leaves individuals feeling alienated and disconnected.",
        "A biological disposition toward criminal behavior.",
        "The economic accumulation of surplus value in factories.",
        "A formal legal contract governing marriage in traditional cultures.",
      ],
      correctAnswer: "A state of normlessness and breakdown of social rules that leaves individuals feeling alienated and disconnected.",
      explanation: "Durkheim described anomie as a condition of instability and normlessness resulting from rapid societal change or economic dislocation.",
    },
    {
      id: "soc_5",
      question: "In sociology, what distinguishes an 'ascribed status' from an 'achieved status'?",
      options: [
        "An ascribed status is assigned at birth or involuntary (e.g. race, age); an achieved status is acquired through personal effort, choice, or accomplishments (e.g. physician, graduate).",
        "An ascribed status requires passing professional board exams.",
        "Achieved status cannot be modified over a lifetime.",
        "Ascribed status only applies to religious organizations.",
      ],
      correctAnswer: "An ascribed status is assigned at birth or involuntary (e.g. race, age); an achieved status is acquired through personal effort, choice, or accomplishments (e.g. physician, graduate).",
      explanation: "Ascribed status is involuntary and present from birth or assigned involuntarily; achieved status is attained through deliberate action or achievement.",
    },
    {
      id: "soc_6",
      question: "What is 'socialization' in the sociological study of human development?",
      options: [
        "The lifelong process through which individuals internalize the values, beliefs, and norms of a given society and learn to function as members.",
        "Attending social parties and recreational events on weekends.",
        "Nationalizing private corporations into government-owned utilities.",
        "Connecting with friends over mobile social media applications.",
      ],
      correctAnswer: "The lifelong process through which individuals internalize the values, beliefs, and norms of a given society and learn to function as members.",
      explanation: "Socialization is the process of learning societal rules, languages, expectations, and cultural roles from family, schools, peer groups, and media.",
    },
    {
      id: "soc_7",
      question: "What is 'Ethnocentrism'?",
      options: [
        "Judging another culture solely by the standards, values, and customs of one's own culture, often assuming one's own culture is superior.",
        "Evaluating a culture strictly within its own historical and social context.",
        "The migration of rural workers to centralized urban industrial centers.",
        "The study of ancient genealogical family trees.",
      ],
      correctAnswer: "Judging another culture solely by the standards, values, and customs of one's own culture, often assuming one's own culture is superior.",
      explanation: "Ethnocentrism involves viewing one's own ethnic or cultural group as central and evaluating other cultural practices through that biased lens.",
    },
    {
      id: "soc_8",
      question: "What distinguishes 'mores' from 'folkways' in cultural norms?",
      options: [
        "Mores are moral norms with significant social consequences and sanctions if violated; folkways are casual customary etiquette with mild social disapproval.",
        "Folkways are codified criminal statutes; mores are unwritten folklore.",
        "Mores only apply to religious rites; folkways apply to workplace behavior.",
        "Folkways never change over time, whereas mores change daily.",
      ],
      correctAnswer: "Mores are moral norms with significant social consequences and sanctions if violated; folkways are casual customary etiquette with mild social disapproval.",
      explanation: "Mores carry deep moral gravity (e.g. prohibitions on incest or theft), while folkways encompass casual social conventions (e.g. dress codes or table manners).",
    },
    {
      id: "soc_9",
      question: "What is 'intergenerational social mobility'?",
      options: [
        "Changes in social status or class position between different generations of a family (e.g. child vs parents).",
        "Moving between different neighborhoods within the same city.",
        "A change in social position that occurs within an individual's single adult career.",
        "Traveling internationally for seasonal agricultural employment.",
      ],
      correctAnswer: "Changes in social status or class position between different generations of a family (e.g. child vs parents).",
      explanation: "Intergenerational mobility examines whether children reach higher or lower socioeconomic status compared to their parents.",
    },
    {
      id: "soc_10",
      question: "According to Max Weber, what three distinct dimensions determine social stratification and inequality?",
      options: [
        "Class (economic wealth), Status (prestige/honor), and Power (political influence)",
        "Age, Geography, and Physical strength",
        "Education level, Marital status, and Homeownership",
        "Religion, Nationality, and Language fluency",
      ],
      correctAnswer: "Class (economic wealth), Status (prestige/honor), and Power (political influence)",
      explanation: "Weber's three-component theory of stratification identifies Class (economic market position), Status (social esteem/honor), and Power (ability to accomplish goals despite opposition).",
    },
    {
      id: "soc_11",
      question: "What characterizes a 'primary group' according to sociologist Charles Horton Cooley?",
      options: [
        "Small, intimate, enduring face-to-face groups characterized by emotional ties (e.g. family, close friends).",
        "Large, formal, impersonal goal-oriented organizations (e.g. corporations, universities).",
        "The political ruling class of a nation state.",
        "Any social group formed exclusively on the internet.",
      ],
      correctAnswer: "Small, intimate, enduring face-to-face groups characterized by emotional ties (e.g. family, close friends).",
      explanation: "Primary groups are small, deeply personal, and long-lasting associations that shape individual self-concept and fundamental values.",
    },
    {
      id: "soc_12",
      question: "What is 'institutional discrimination' in sociological analysis?",
      options: [
        "Unfair or unequal treatment embedded into the routine policies, practices, and structures of social institutions (e.g. criminal justice, banking, housing).",
        "An isolated biased remark made by an individual employee.",
        "A private club's formal constitution.",
        "A legal lawsuit settled out of court between business partners.",
      ],
      correctAnswer: "Unfair or unequal treatment embedded into the routine policies, practices, and structures of social institutions (e.g. criminal justice, banking, housing).",
      explanation: "Institutional discrimination refers to systemic practices that systematically disadvantage subordinate group members, even in the absence of overt personal prejudice.",
    },
  ],

  // --------------------------------------------------------------------------
  // 7. COGNITIVE PSYCHOLOGY / PSYCHOLOGY
  // --------------------------------------------------------------------------
  "cognitive psychology": [
    {
      id: "cp_1",
      question: "What is George Miller's classic finding regarding the capacity limit of human short-term/working memory?",
      options: [
        "7 plus or minus 2 chunks of information",
        "15 items regardless of chunking",
        "Exactly 3 items for no longer than 2 seconds",
        "Unlimited capacity if presented visually",
      ],
      correctAnswer: "7 plus or minus 2 chunks of information",
      explanation: "George Miller's landmark 1956 paper established that human short-term memory can retain approximately 7 ± 2 discrete informational chunks.",
    },
    {
      id: "cp_2",
      question: "In Alan Baddeley's model of working memory, which component is responsible for managing attention and coordinating the slave systems?",
      options: ["The Central Executive", "The Phonological Loop", "The Visuospatial Sketchpad", "The Sensory Buffer"],
      correctAnswer: "The Central Executive",
      explanation: "Baddeley's Central Executive directs focus, suppresses task-irrelevant information, coordinates the phonological loop and visuospatial sketchpad, and handles cognitive switching.",
    },
    {
      id: "cp_3",
      question: "What cognitive phenomenon does the classic 'Stroop Effect' demonstrate?",
      options: [
        "Reaction time delays when naming the ink color of a printed word that spells an incongruent color name (e.g. the word 'RED' printed in blue ink).",
        "Enhanced memory recall when studying in the same room where the exam is taken.",
        "The inability to perceive visual objects in the peripheral field during motion.",
        "Loss of memory retention for events occurring prior to a traumatic concussion.",
      ],
      correctAnswer: "Reaction time delays when naming the ink color of a printed word that spells an incongruent color name (e.g. the word 'RED' printed in blue ink).",
      explanation: "The Stroop effect illustrates interference between automatic reading processes and deliberate color naming, showing the limits of cognitive control.",
    },
    {
      id: "cp_4",
      question: "What is the 'Availability Heuristic' identified by Amos Tversky and Daniel Kahneman?",
      options: [
        "Estimating the frequency or likelihood of an event based on how easily examples of it come to mind.",
        "Judging a person based on how closely they resemble a mental stereotype.",
        "Overestimating one's ability to have predicted an outcome after it has already occurred.",
        "Anchoring an estimate to the first arbitrary numerical value provided.",
      ],
      correctAnswer: "Estimating the frequency or likelihood of an event based on how easily examples of it come to mind.",
      explanation: "The availability heuristic leads people to assess risk or probability based on cognitive ease of recall (e.g. fearing plane crashes more than car accidents due to dramatic media coverage).",
    },
    {
      id: "cp_5",
      question: "What is 'Cognitive Dissonance' as formulated by Leon Festinger?",
      options: [
        "Psychological discomfort experienced when holding contradictory beliefs, ideas, or values, or when behavior conflicts with beliefs.",
        "Hearing persistent ringing tones in the inner ear after loud concerts.",
        "The gradual loss of memory retention across aging adults.",
        "Difficulty interpreting auditory speech in noisy environments.",
      ],
      correctAnswer: "Psychological discomfort experienced when holding contradictory beliefs, ideas, or values, or when behavior conflicts with beliefs.",
      explanation: "Festinger's cognitive dissonance theory states that conflicting cognitions produce distressing psychological tension, driving individuals to rationalize or alter their attitudes.",
    },
    {
      id: "cp_6",
      question: "What distinguishes 'top-down processing' from 'bottom-up processing' in human perception?",
      options: [
        "Top-down processing uses prior knowledge, context, and expectations to interpret sensory input; bottom-up begins with raw sensory stimuli driving perception.",
        "Top-down processing only occurs while asleep; bottom-up occurs while awake.",
        "Top-down processing occurs in the spinal cord; bottom-up occurs in the cortex.",
        "Top-down is strictly auditory; bottom-up is strictly visual.",
      ],
      correctAnswer: "Top-down processing uses prior knowledge, context, and expectations to interpret sensory input; bottom-up begins with raw sensory stimuli driving perception.",
      explanation: "Bottom-up processing constructs perception from raw sensory data (data-driven). Top-down processing uses concepts, past experiences, and expectations to interpret that data (conceptually driven).",
    },
    {
      id: "cp_7",
      question: "What is the 'Serial Position Effect' observed in memory recall experiments?",
      options: [
        "Items presented at the beginning (primacy effect) and end (recency effect) of a list are recalled significantly better than items in the middle.",
        "People only recall numbers if they are presented in ascending numerical order.",
        "Memory recall is highest when items are repeated exactly 10 times in a row.",
        "Memories are recalled in reverse chronological order during stress.",
      ],
      correctAnswer: "Items presented at the beginning (primacy effect) and end (recency effect) of a list are recalled significantly better than items in the middle.",
      explanation: "The primacy effect reflects transfer of early items to long-term memory via rehearsal; the recency effect reflects items lingering in active short-term memory.",
    },
    {
      id: "cp_8",
      question: "In Endel Tulving's taxonomy of long-term memory, what is the difference between 'Episodic Memory' and 'Semantic Memory'?",
      options: [
        "Episodic memory stores personally experienced autobiographical events with spatial/temporal context; semantic memory stores generalized facts, concepts, and world knowledge.",
        "Episodic memory stores physical motor skills; semantic memory stores emotional trauma.",
        "Semantic memory decays in minutes; episodic memory is permanent.",
        "Episodic memory only handles foreign language vocabularies.",
      ],
      correctAnswer: "Episodic memory stores personally experienced autobiographical events with spatial/temporal context; semantic memory stores generalized facts, concepts, and world knowledge.",
      explanation: "Episodic memory is 'mental time travel' to personal experiences (what you ate yesterday); semantic memory contains decontextualized factual knowledge (Paris is the capital of France).",
    },
    {
      id: "cp_9",
      question: "What is 'Confirmation Bias' in human reasoning?",
      options: [
        "The tendency to search for, interpret, favor, and recall information that confirms preexisting beliefs while disregarding contradictory evidence.",
        "Confirming an appointment multiple times to prevent forgetfulness.",
        "The belief that other people share your exact opinions.",
        "Overestimating how much your past choices were admired by peers.",
      ],
      correctAnswer: "The tendency to search for, interpret, favor, and recall information that confirms preexisting beliefs while disregarding contradictory evidence.",
      explanation: "Confirmation bias leads individuals to selectively embrace evidence affirming their hypotheses while rationalizing away counter-evidence.",
    },
    {
      id: "cp_10",
      question: "What is the 'Cocktail Party Phenomenon' in cognitive research on selective attention?",
      options: [
        "The ability to focus auditory attention on a single conversation in a noisy room while retaining unconscious sensitivity to your own name spoken across the room.",
        "The decline in decision-making capacity after consuming alcohol in social gatherings.",
        "The tendency to imitate speech accents of people in group settings.",
        "Auditory hallucinations triggered by rhythmic background music.",
      ],
      correctAnswer: "The ability to focus auditory attention on a single conversation in a noisy room while retaining unconscious sensitivity to your own name spoken across the room.",
      explanation: "Colin Cherry's cocktail party effect demonstrates selective filter mechanisms and unconscious semantic processing of personally salient stimuli (like hearing one's name).",
    },
    {
      id: "cp_11",
      question: "In Jean Piaget's cognitive development theory, what is a 'schema'?",
      options: [
        "A mental framework or organized pattern of thought that categorizes information and relationships to interpret the world.",
        "A biological genetic marker governing emotional temperament.",
        "A formal intelligence assessment administered to school children.",
        "An unconscious reflex present only during infancy.",
      ],
      correctAnswer: "A mental framework or organized pattern of thought that categorizes information and relationships to interpret the world.",
      explanation: "Schemas are cognitive building blocks of knowledge that allow individuals to organize, adapt, assimilate, and accommodate new information.",
    },
    {
      id: "cp_12",
      question: "What is 'Neuroplasticity' in cognitive neuroscience?",
      options: [
        "The brain's ability to reorganize itself by forming new neural connections throughout life in response to learning, experience, or injury.",
        "The surgical replacement of damaged cranial nerves with synthetic polymers.",
        "The rigid, unalterable nature of brain architecture after early childhood.",
        "The electrical conductivity speed of myelin sheaths.",
      ],
      correctAnswer: "The brain's ability to reorganize itself by forming new neural connections throughout life in response to learning, experience, or injury.",
      explanation: "Neuroplasticity allows neural networks in the brain to grow, prune, and rewire structurally and functionally across the lifespan.",
    },
  ],

  // --------------------------------------------------------------------------
  // 8. LINEAR ALGEBRA (Mathematics)
  // --------------------------------------------------------------------------
  "linear algebra": [
    {
      id: "la_1",
      question: "What is the geometric interpretation of the dot product between two non-zero Euclidean vectors $\\vec{u}$ and $\\vec{v}$?",
      options: [
        "$\\vec{u} \\cdot \\vec{v} = ||\\vec{u}|| \\cdot ||\\vec{v}|| \\cos(\\theta)$, which equals zero if and only if the vectors are orthogonal (perpendicular).",
        "It yields a third vector perpendicular to both $\\vec{u}$ and $\\vec{v}$.",
        "It calculates the ratio of their vector magnitudes.",
        "It represents the determinant of the 2x2 matrix formed by the vectors.",
      ],
      correctAnswer: "$\\vec{u} \\cdot \\vec{v} = ||\\vec{u}|| \\cdot ||\\vec{v}|| \\cos(\\theta)$, which equals zero if and only if the vectors are orthogonal (perpendicular).",
      explanation: "The dot product scales with the product of their norms and the cosine of the enclosed angle; if $\\theta = 90^\\circ$, $\\cos(90^\\circ) = 0$, confirming orthogonality.",
    },
    {
      id: "la_2",
      question: "For a square matrix $A$, what equation defines an eigenvalue $\\lambda$ and corresponding non-zero eigenvector $\\vec{v}$?",
      options: [
        "$A\\vec{v} = \\lambda\\vec{v}$",
        "$A + \\vec{v} = \\lambda I$",
        "$A\\vec{v} = 0$",
        "$\\det(A) = \\lambda ||\\vec{v}||$",
      ],
      correctAnswer: "$A\\vec{v} = \\lambda\\vec{v}$",
      explanation: "An eigenvector $\\vec{v}$ of matrix $A$ is a non-zero vector that changes only by a scalar factor $\\lambda$ (the eigenvalue) when $A$ is applied to it.",
    },
    {
      id: "la_3",
      question: "What condition must the determinant of a square matrix $A$ satisfy for $A$ to be invertible (non-singular)?",
      options: [
        "$\\det(A) \\neq 0$",
        "$\\det(A) = 0$",
        "$\\det(A) = 1$",
        "$\\det(A) > 0$",
      ],
      correctAnswer: "$\\det(A) \\neq 0$",
      explanation: "A square matrix is invertible if and only if its determinant is non-zero, indicating that its columns are linearly independent.",
    },
    {
      id: "la_4",
      question: "What is the transpose of the product of two matrices $A$ and $B$, assuming dimensions are compatible for multiplication?",
      options: ["$(AB)^T = B^T A^T$", "$(AB)^T = A^T B^T$", "$(AB)^T = (A^T)(B^T)^{-1}$", "$(AB)^T = AB$"],
      correctAnswer: "$(AB)^T = B^T A^T$",
      explanation: "The transpose of a matrix product reverses the order of factors: $(AB)^T = B^T A^T$.",
    },
    {
      id: "la_5",
      question: "What is the 'rank' of an $m \\times n$ matrix $A$?",
      options: [
        "The maximum number of linearly independent row or column vectors in the matrix.",
        "The sum of all entries on the main diagonal.",
        "The product of the row count and column count.",
        "The absolute value of the largest entry.",
      ],
      correctAnswer: "The maximum number of linearly independent row or column vectors in the matrix.",
      explanation: "Rank represents the dimension of the vector space spanned by the columns (column rank) or rows (row rank), which are always equal.",
    },
    {
      id: "la_6",
      question: "What does it mean for a set of vectors $\\{\\vec{v}_1, \\vec{v}_2, ..., \\vec{v}_k\\}$ to be 'linearly independent'?",
      options: [
        "The only scalar solution to $c_1\\vec{v}_1 + c_2\\vec{v}_2 + ... + c_k\\vec{v}_k = \\vec{0}$ is $c_1 = c_2 = ... = c_k = 0$.",
        "Every vector has unit length equal to 1.",
        "All vectors are parallel to one another.",
        "No vector contains negative components.",
      ],
      correctAnswer: "The only scalar solution to $c_1\\vec{v}_1 + c_2\\vec{v}_2 + ... + c_k\\vec{v}_k = \\vec{0}$ is $c_1 = c_2 = ... = c_k = 0$.",
      explanation: "Linear independence means no vector in the set can be expressed as a linear combination of the other vectors.",
    },
    {
      id: "la_7",
      question: "What is the 'Trace' of a square $n \\times n$ matrix?",
      options: [
        "The sum of the elements along the main diagonal from top-left to bottom-right.",
        "The determinant divided by the rank.",
        "The largest eigenvalue of the matrix.",
        "The number of non-zero entries in the upper triangle.",
      ],
      correctAnswer: "The sum of the elements along the main diagonal from top-left to bottom-right.",
      explanation: "The trace of a square matrix is defined as $\\text{tr}(A) = \\sum_{i=1}^n a_{ii}$, which also equals the sum of its eigenvalues.",
    },
    {
      id: "la_8",
      question: "What is the 'Null Space' (or Kernel) of a linear transformation represented by matrix $A$?",
      options: [
        "The set of all vectors $\\vec{x}$ such that $A\\vec{x} = \\vec{0}$.",
        "The set of all eigenvalues equal to zero.",
        "The transpose of the identity matrix.",
        "The set of vectors that cannot be multiplied by $A$.",
      ],
      correctAnswer: "The set of all vectors $\\vec{x}$ such that $A\\vec{x} = \\vec{0}$.",
      explanation: "The null space $\\text{Null}(A)$ consists of all input vectors mapped to the zero vector by the linear map $A$.",
    },
    {
      id: "la_9",
      question: "According to the Rank-Nullity Theorem, for an $m \\times n$ matrix $A$, what is the sum of $\\text{rank}(A)$ and $\\text{nullity}(A)$?",
      options: [
        "$n$ (the number of columns / dimension of the domain)",
        "$m$ (the number of rows)",
        "$m \\times n$",
        "$\\det(A)$",
      ],
      correctAnswer: "$n$ (the number of columns / dimension of the domain)",
      explanation: "The Rank-Nullity Theorem states: $\\text{rank}(A) + \\text{nullity}(A) = n$, where $n$ is the dimension of the domain.",
    },
    {
      id: "la_10",
      question: "What special property defines an 'Orthogonal Matrix' $Q$?",
      options: [
        "$Q^T Q = Q Q^T = I$ (meaning $Q^{-1} = Q^T$)",
        "$Q = Q^T$ (the matrix is symmetric)",
        "$\\det(Q) = 0$",
        "All non-diagonal entries are equal to 1",
      ],
      correctAnswer: "$Q^T Q = Q Q^T = I$ (meaning $Q^{-1} = Q^T$)",
      explanation: "An orthogonal matrix has mutually orthonormal columns and rows, satisfying $Q^T Q = I$, meaning its inverse is simply its transpose.",
    },
    {
      id: "la_11",
      question: "What is the cross product $\\vec{u} \\times \\vec{v}$ of two vectors in $\\mathbb{R}^3$?",
      options: [
        "A vector perpendicular (orthogonal) to both $\\vec{u}$ and $\\vec{v}$ with magnitude equal to the area of the parallelogram they span.",
        "A scalar quantity representing their shared area.",
        "The sum of their pairwise coordinate products.",
        "A vector in the exact same direction as $\\vec{u}$.",
      ],
      correctAnswer: "A vector perpendicular (orthogonal) to both $\\vec{u}$ and $\\vec{v}$ with magnitude equal to the area of the parallelogram they span.",
      explanation: "In 3D space, $\\vec{u} \\times \\vec{v}$ yields a vector orthogonal to both inputs whose norm is $|\\vec{u}||\\vec{v}|\\sin(\\theta)$, oriented by the right-hand rule.",
    },
    {
      id: "la_12",
      question: "What is Singular Value Decomposition (SVD) of an arbitrary real $m \\times n$ matrix $A$?",
      options: [
        "$A = U \\Sigma V^T$, where $U$ and $V$ are orthogonal matrices and $\\Sigma$ is diagonal with non-negative singular values.",
        "$A = P D P^{-1}$, requiring $A$ to be a square matrix.",
        "$A = L U$, factoring $A$ into lower and upper triangular matrices.",
        "$A = Q R$, where $Q$ is orthogonal and $R$ is symmetric.",
      ],
      correctAnswer: "$A = U \\Sigma V^T$, where $U$ and $V$ are orthogonal matrices and $\\Sigma$ is diagonal with non-negative singular values.",
      explanation: "SVD factors any real matrix into $U \\Sigma V^T$, fundamental to principal component analysis (PCA), compression, and pseudo-inverses.",
    },
  ],

  // --------------------------------------------------------------------------
  // 9. CALCULUS (Mathematics)
  // --------------------------------------------------------------------------
  calculus: [
    {
      id: "calc_1",
      question: "What is the derivative of $f(x) = x^n$ with respect to $x$ according to the Power Rule?",
      options: [
        "$n x^{n-1}$",
        "$(n-1) x^n$",
        "$x^{n+1} / (n+1)$",
        "$n x^n$",
      ],
      correctAnswer: "$n x^{n-1}$",
      explanation: "The power rule states that $\\frac{d}{dx}[x^n] = n x^{n-1}$ for any real exponent $n$.",
    },
    {
      id: "calc_2",
      question: "What is the derivative of the natural exponential function $f(x) = e^x$?",
      options: ["$e^x$", "$x e^{x-1}$", "$\\ln(x)$", "$1 / x$"],
      correctAnswer: "$e^x$",
      explanation: "The exponential function with base $e$ is uniquely its own derivative: $\\frac{d}{dx}[e^x] = e^x$.",
    },
    {
      id: "calc_3",
      question: "According to the Product Rule, what is $\\frac{d}{dx}[u(x) \\cdot v(x)]$?",
      options: [
        "$u'(x)v(x) + u(x)v'(x)$",
        "$u'(x) \\cdot v'(x)$",
        "$u'(x)v(x) - u(x)v'(x)$",
        "$(u'(x) + v'(x)) / 2$",
      ],
      correctAnswer: "$u'(x)v(x) + u(x)v'(x)$",
      explanation: "The product rule for differentiation is $\\frac{d}{dx}[uv] = u'v + uv'$.",
    },
    {
      id: "calc_4",
      question: "What rule is used to differentiate a composite function $f(g(x))$?",
      options: [
        "The Chain Rule: $f'(g(x)) \\cdot g'(x)$",
        "The Quotient Rule: $(f'(x)g(x) - f(x)g'(x)) / g(x)^2$",
        "L'Hôpital's Rule: $f'(x) / g'(x)$",
        "The Fundamental Theorem of Calculus",
      ],
      correctAnswer: "The Chain Rule: $f'(g(x)) \\cdot g'(x)$",
      explanation: "The Chain Rule differentiates composite functions by multiplying the derivative of the outer function by the derivative of the inner function.",
    },
    {
      id: "calc_5",
      question: "What does the First Derivative Test state regarding a critical point $c$ where $f'(c) = 0$?",
      options: [
        "If $f'(x)$ changes sign from positive to negative at $c$, $f$ has a local maximum at $c$; if from negative to positive, a local minimum.",
        "If $f'(c) = 0$, $f(c)$ is guaranteed to be an absolute maximum.",
        "If $f'(c) = 0$, the function is undefined at $c$.",
        "The function must be a straight line across the interval.",
      ],
      correctAnswer: "If $f'(x)$ changes sign from positive to negative at $c$, $f$ has a local maximum at $c$; if from negative to positive, a local minimum.",
      explanation: "A positive-to-negative slope transition signifies an apex (local maximum); a negative-to-positive transition signifies a trough (local minimum).",
    },
    {
      id: "calc_6",
      question: "What is the formula for Integration by Parts derived from the product rule of differentiation?",
      options: [
        "$\\int u \\, dv = u v - \\int v \\, du$",
        "$\\int u \\, dv = \\int u \\, dx \\cdot \\int v \\, dx$",
        "$\\int u \\, dv = u' v + u v'$",
        "$\\int u \\, dv = u v + \\int v \\, du$",
      ],
      correctAnswer: "$\\int u \\, dv = u v - \\int v \\, du$",
      explanation: "Integration by parts states $\\int u \\, dv = uv - \\int v \\, du$, enabling integration of products of polynomials, exponentials, and trigonometric functions.",
    },
    {
      id: "calc_7",
      question: "What condition permits the application of L'Hôpital's Rule to evaluate the limit $\\lim_{x \\to c} \\frac{f(x)}{g(x)}$?",
      options: [
        "The limit yields an indeterminate form of type $0/0$ or $\\pm\\infty / \\pm\\infty$, and derivatives $f'(x)$ and $g'(x)$ exist near $c$ with $g'(x) \\neq 0$.",
        "The function $g(x)$ is equal to a constant non-zero integer.",
        "The limit evaluates directly to 1.",
        "The function $f(x)$ is a polynomial of degree 2 or less.",
      ],
      correctAnswer: "The limit yields an indeterminate form of type $0/0$ or $\\pm\\infty / \\pm\\infty$, and derivatives $f'(x)$ and $g'(x)$ exist near $c$ with $g'(x) \\neq 0$.",
      explanation: "L'Hôpital's Rule allows evaluating indeterminate limits of form $0/0$ or $\\infty/\\infty$ by taking the derivative of numerator and denominator: $\\lim \\frac{f'(x)}{g'(x)}$.",
    },
    {
      id: "calc_8",
      question: "What is the derivative of $f(x) = \\ln(x)$ for $x > 0$?",
      options: ["$1 / x$", "$e^x$", "$1 / x^2$", "$x$"],
      correctAnswer: "$1 / x$",
      explanation: "The derivative of the natural logarithm $\\ln(x)$ is $\\frac{1}{x}$ for all $x > 0$.",
    },
    {
      id: "calc_9",
      question: "What does the Second Derivative $f''(x) > 0$ over an open interval indicate about the graph of $f(x)$?",
      options: [
        "The graph is concave upward ('holds water') over that interval.",
        "The graph is strictly decreasing over that interval.",
        "The graph has a horizontal asymptote at $y = 0$.",
        "The graph is concave downward over that interval.",
      ],
      correctAnswer: "The graph is concave upward ('holds water') over that interval.",
      explanation: "When $f''(x) > 0$, the slope $f'(x)$ is increasing, which means the curve bends upward (concave up).",
    },
    {
      id: "calc_10",
      question: "According to the Fundamental Theorem of Calculus (Part 2), how is the definite integral $\\int_a^b f(x) \\, dx$ evaluated if $F'(x) = f(x)$?",
      options: [
        "$F(b) - F(a)$",
        "$F'(b) - F'(a)$",
        "$f(b) - f(a)$",
        "$F(b) \\cdot F(a)$",
      ],
      correctAnswer: "$F(b) - F(a)$",
      explanation: "The Fundamental Theorem connects integration with anti-differentiation: $\\int_a^b f(x) \\, dx = F(b) - F(a)$.",
    },
    {
      id: "calc_11",
      question: "What is the derivative of $f(x) = \\sin(x)$ with respect to $x$?",
      options: ["$\\cos(x)$", "$-\\cos(x)$", "$\\tan(x)$", "$-\\sin(x)$"],
      correctAnswer: "$\\cos(x)$",
      explanation: "The derivative of $\\sin(x)$ is $\\cos(x)$, whereas the derivative of $\\cos(x)$ is $-\\sin(x)$.",
    },
    {
      id: "calc_12",
      question: "What does the Mean Value Theorem state for a function $f$ continuous on $[a, b]$ and differentiable on $(a, b)$?",
      options: [
        "There exists at least one $c \\in (a, b)$ such that $f'(c) = \\frac{f(b) - f(a)}{b - a}$.",
        "The function must equal zero at least once on $(a, b)$.",
        "The maximum value of $f$ must occur at the midpoint $(a + b)/2$.",
        "The derivative must be strictly positive everywhere on $[a, b]$.",
      ],
      correctAnswer: "There exists at least one $c \\in (a, b)$ such that $f'(c) = \\frac{f(b) - f(a)}{b - a}$.",
      explanation: "The Mean Value Theorem guarantees at least one point $c$ where instantaneous rate of change equals the average rate of change over the interval.",
    },
  ],
};

// Aliases for user convenience (e.g. "psychology" -> "cognitive psychology")
ADDITIONAL_BANKS.psychology = ADDITIONAL_BANKS["cognitive psychology"];

module.exports = { ADDITIONAL_BANKS };
