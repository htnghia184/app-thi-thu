-- Seed: Sample English Exam
INSERT INTO exams (id, title, description, duration_minutes, is_published)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'English Reading Practice Test',
  'A comprehensive practice test for the Reading section with 4 passages and 40 questions.',
  60,
  TRUE
);

-- Passage 1
INSERT INTO passages (id, exam_id, passage_number, title, content)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  1,
  'The Future of Renewable Energy',
  '<h2 class="text-xl font-bold text-indigo-900 mb-4">Section 1: The Future of Renewable Energy</h2>
<p class="mb-4 leading-relaxed">In recent decades, the rapid growth of urban populations has placed unprecedented strain on transportation systems worldwide. Cities across the globe are grappling with traffic congestion, air pollution, and the urgent need to reduce carbon emissions. As a result, renewable energy has emerged as a critical priority for governments, businesses, and citizens alike.</p>
<p class="mb-4 leading-relaxed">Solar power, in particular, has seen remarkable growth. The cost of photovoltaic cells has dropped by more than 80% over the past decade, making solar energy increasingly competitive with fossil fuels. Countries like Germany and China have invested heavily in solar infrastructure, demonstrating that large-scale renewable energy is not only possible but economically viable.</p>
<p class="mb-4 leading-relaxed">Wind energy has also experienced significant expansion. Offshore wind farms, while more expensive to install than their onshore counterparts, offer the advantage of stronger and more consistent winds. The United Kingdom, Denmark, and the Netherlands have become leaders in offshore wind technology, with several projects now capable of powering millions of homes.</p>
<p class="mb-4 leading-relaxed">However, challenges remain. Energy storage continues to be a significant hurdle, as the intermittent nature of solar and wind power requires robust battery systems to ensure a stable energy supply. Advances in lithium-ion technology and emerging alternatives such as hydrogen fuel cells offer promising solutions to this challenge.</p>
<p class="mb-4 leading-relaxed">The transition to renewable energy also requires substantial updates to existing power grids. Smart grid technology, which uses digital communication to detect and react to local changes in usage, will be essential for managing the complex flow of energy from diverse renewable sources. While the initial investment is substantial, the long-term benefits of reduced emissions and energy independence make it a worthwhile endeavor.</p>'
);

-- Passage 1 Questions
INSERT INTO questions (passage_id, question_number, question_text, options, correct_answer, explanation) VALUES
('10000000-0000-0000-0000-000000000001', 1, 'According to the passage, what has made solar energy more competitive with fossil fuels?', '["Government subsidies", "A drop in the cost of photovoltaic cells", "Increased oil prices", "New environmental regulations"]', 1, 'The passage states: "The cost of photovoltaic cells has dropped by more than 80% over the past decade, making solar energy increasingly competitive with fossil fuels."'),
('10000000-0000-0000-0000-000000000001', 2, 'Which countries are mentioned as leaders in offshore wind technology?', '["Germany, China, and Japan", "The United States, Canada, and Mexico", "The United Kingdom, Denmark, and the Netherlands", "France, Spain, and Portugal"]', 2, 'The passage mentions: "The United Kingdom, Denmark, and the Netherlands have become leaders in offshore wind technology."'),
('10000000-0000-0000-0000-000000000001', 3, 'What is described as a significant challenge for renewable energy?', '["Lack of public support", "High cost of solar panels", "Energy storage", "Shortage of wind"]', 2, 'The passage states: "Energy storage continues to be a significant hurdle, as the intermittent nature of solar and wind power requires robust battery systems."'),
('10000000-0000-0000-0000-000000000001', 4, 'What is smart grid technology used for?', '["Generating more electricity", "Detecting and reacting to local changes in usage", "Building more power plants", "Reducing energy consumption"]', 1, 'The passage explains: "Smart grid technology, which uses digital communication to detect and react to local changes in usage, will be essential."'),
('10000000-0000-0000-0000-000000000001', 5, 'What advantage do offshore wind farms have over onshore ones?', '["Lower installation costs", "Stronger and more consistent winds", "Closer to urban areas", "Less environmental impact"]', 1, 'The passage notes: "Offshore wind farms offer the advantage of stronger and more consistent winds."'),
('10000000-0000-0000-0000-000000000001', 6, 'What emerging alternative to lithium-ion batteries is mentioned?', '["Solar cells", "Nuclear power", "Hydrogen fuel cells", "Natural gas"]', 2, 'The passage mentions: "Emerging alternatives such as hydrogen fuel cells offer promising solutions."'),
('10000000-0000-0000-0000-000000000001', 7, 'Which countries have invested heavily in solar infrastructure according to the passage?', '["The UK and Denmark", "The US and Canada", "Germany and China", "France and Spain"]', 2, 'The passage states: "Countries like Germany and China have invested heavily in solar infrastructure."'),
('10000000-0000-0000-0000-000000000001', 8, 'What does the passage suggest about the long-term benefits of grid updates?', '["They are too expensive to justify", "They are worthwhile despite the initial investment", "They should be postponed", "They are only for developed countries"]', 1, 'The passage concludes: "While the initial investment is substantial, the long-term benefits make it a worthwhile endeavor."'),
('10000000-0000-0000-0000-000000000001', 9, 'The word "intermittent" in paragraph 4 is closest in meaning to:', '["Continuous", "Unpredictable and irregular", "Powerful", "Sustainable"]', 1, '"Intermittent" means occurring at irregular intervals, not continuously. The context discusses how solar and wind power are not always available.'),
('10000000-0000-0000-0000-000000000001', 10, 'What is the main idea of the passage?', '["Fossil fuels are still the best energy source", "Renewable energy is growing but faces challenges", "Solar power is the only solution", "Wind energy is too expensive"]', 1, 'The passage discusses the growth of renewable energy (solar and wind) while acknowledging the challenges that remain.');

-- Passage 2
INSERT INTO passages (id, exam_id, passage_number, title, content)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  2,
  'The History of Communication',
  '<h2 class="text-xl font-bold text-indigo-900 mb-4">Section 2: The History of Communication</h2>
<p class="mb-4 leading-relaxed">The history of communication is a fascinating journey that spans thousands of years, from the earliest cave paintings to the internet age. Each major advancement has fundamentally changed how humans interact, share information, and organize society.</p>
<p class="mb-4 leading-relaxed">The invention of writing around 3400 BCE in Mesopotamia marked a turning point in human history. For the first time, information could be stored and transmitted across time and space without relying on human memory. The development of alphabets further democratized literacy, making written communication accessible beyond a small class of scribes.</p>
<p class="mb-4 leading-relaxed">The printing press, invented by Johannes Gutenberg in the 15th century, revolutionized communication by making books and written materials widely available. This innovation played a crucial role in the Renaissance, the Reformation, and the Scientific Revolution by facilitating the rapid spread of new ideas.</p>
<p class="mb-4 leading-relaxed">The 19th and 20th centuries brought an explosion of new communication technologies. The telegraph, telephone, radio, and television each transformed society in profound ways, shrinking the world and enabling real-time communication across vast distances.</p>'
);

-- Passage 2 Questions
INSERT INTO questions (passage_id, question_number, question_text, options, correct_answer, explanation) VALUES
('10000000-0000-0000-0000-000000000002', 1, 'When and where was writing first invented?', '["Around 2000 BCE in Egypt", "Around 3400 BCE in Mesopotamia", "Around 4000 BCE in China", "Around 1000 BCE in Greece"]', 1, 'The passage states: "The invention of writing around 3400 BCE in Mesopotamia marked a turning point in human history."'),
('10000000-0000-0000-0000-000000000002', 2, 'What was one effect of the development of alphabets?', '["It made writing more complex", "It democratized literacy", "It reduced the need for writing", "It was opposed by scribes"]', 1, 'The passage states alphabets "made written communication accessible beyond a small class of scribes" - i.e., democratized literacy.'),
('10000000-0000-0000-0000-000000000002', 3, 'Who invented the printing press?', '["Leonardo da Vinci", "Johannes Gutenberg", "Benjamin Franklin", "Thomas Edison"]', 1, 'The passage clearly states: "The printing press, invented by Johannes Gutenberg in the 15th century."'),
('10000000-0000-0000-0000-000000000002', 4, 'The phrase "democratized literacy" most likely means:', '["Made reading and writing available to more people", "Created a democratic government", "Made books more expensive", "Limited reading to scholars"]', 0, '"Democratized" means to make something accessible to everyone. In this context, alphabets made reading and writing available beyond just scribes.'),
('10000000-0000-0000-0000-000000000002', 5, 'What role did the printing press play in the Renaissance?', '["It slowed down the spread of ideas", "It facilitated the rapid spread of new ideas", "It was not related to the Renaissance", "It only printed religious texts"]', 1, 'The passage mentions the printing press "played a crucial role in the Renaissance by facilitating the rapid spread of new ideas."'),
('10000000-0000-0000-0000-000000000002', 6, 'Which technologies from the 19th and 20th centuries are mentioned?', '["Email and smartphones", "The internet and social media", "Telegraph, telephone, radio, and television", "Fax machines and pagers"]', 2, 'The passage lists: "The telegraph, telephone, radio, and television each transformed society."'),
('10000000-0000-0000-0000-000000000002', 7, 'What common effect did new communication technologies have?', '["They isolated communities", "They shrunk the world", "They were only used by the rich", "They replaced face-to-face contact"]', 1, 'The passage says they "transformed society in profound ways, shrinking the world."'),
('10000000-0000-0000-0000-000000000002', 8, 'What does "transmitted" mean as used in the passage?', '["Created", "Sent or passed on", "Destroyed", "Hidden"]', 1, 'In context, "information could be stored and transmitted across time and space" means information could be sent or passed on.'),
('10000000-0000-0000-0000-000000000002', 9, 'What existed before the invention of writing?', '["Books", "Libraries", "Cave paintings", "Printing presses"]', 2, 'The first sentence mentions the journey "from the earliest cave paintings to the internet age," indicating cave paintings preceded writing.'),
('10000000-0000-0000-0000-000000000002', 10, 'What is the main purpose of this passage?', '["To explain how to use modern communication", "To trace the historical development of communication", "To argue for simpler communication methods", "To compare different writing systems"]', 1, 'The passage provides a chronological overview of communication advancements throughout history.');

-- Passage 3
INSERT INTO passages (id, exam_id, passage_number, title, content)
VALUES (
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  3,
  'The Human Brain: A Marvel of Nature',
  '<h2 class="text-xl font-bold text-indigo-900 mb-4">Section 3: The Human Brain: A Marvel of Nature</h2>
<p class="mb-4 leading-relaxed">The human brain is one of the most complex and fascinating organs in the known universe. With approximately 86 billion neurons, each connected to thousands of others, the brain contains more connections than there are stars in the Milky Way galaxy.</p>
<p class="mb-4 leading-relaxed">Neuroplasticity, the brain''s ability to reorganize itself by forming new neural connections throughout life, has been one of the most important discoveries in modern neuroscience. This capacity allows the brain to adapt to new experiences, learn new information, and even recover from injuries. Contrary to earlier beliefs, the brain continues to change and develop well into old age.</p>
<p class="mb-4 leading-relaxed">Different regions of the brain are responsible for different functions. The frontal lobe is involved in decision-making and problem-solving, the temporal lobe processes auditory information and is crucial for memory formation, and the occipital lobe is primarily responsible for visual processing. The cerebellum coordinates movement and balance.</p>
<p class="mb-4 leading-relaxed">Sleep plays a vital role in brain function. During sleep, the brain consolidates memories, clears out metabolic waste, and processes emotions. Studies have shown that adequate sleep is essential for learning, creativity, and emotional stability. Chronic sleep deprivation has been linked to a range of health problems, including impaired cognitive function and increased risk of neurological disorders.</p>'
);

-- Passage 3 Questions
INSERT INTO questions (passage_id, question_number, question_text, options, correct_answer, explanation) VALUES
('10000000-0000-0000-0000-000000000003', 1, 'Approximately how many neurons does the human brain have?', '["86 million", "86 billion", "860 billion", "8.6 billion"]', 1, 'The passage states: "with approximately 86 billion neurons."'),
('10000000-0000-0000-0000-000000000003', 2, 'What is neuroplasticity?', '["The brain''s ability to create new neurons", "The brain''s ability to reorganize itself by forming new connections", "The brain''s ability to grow larger", "The brain''s ability to repair damaged tissue"]', 1, 'Neuroplasticity is defined as "the brain''s ability to reorganize itself by forming new neural connections throughout life."'),
('10000000-0000-0000-0000-000000000003', 3, 'Which part of the brain is responsible for visual processing?', '["Frontal lobe", "Temporal lobe", "Occipital lobe", "Cerebellum"]', 2, 'The passage states: "the occipital lobe is primarily responsible for visual processing."'),
('10000000-0000-0000-0000-000000000003', 4, 'What does the cerebellum coordinate?', '["Decision-making and problem-solving", "Auditory processing and memory", "Movement and balance", "Visual processing"]', 2, 'The passage states: "The cerebellum coordinates movement and balance."'),
('10000000-0000-0000-0000-000000000003', 5, 'During sleep, the brain performs all of the following EXCEPT:', '["Consolidating memories", "Clearing out metabolic waste", "Processing emotions", "Growing new neurons"]', 3, 'The passage mentions memory consolidation, clearing waste, and processing emotions during sleep, but does NOT mention growing new neurons.'),
('10000000-0000-0000-0000-000000000003', 6, 'Which of the following has been linked to chronic sleep deprivation?', '["Improved memory", "Impaired cognitive function", "Enhanced creativity", "Better emotional stability"]', 1, 'The passage states chronic sleep deprivation is linked to "impaired cognitive function and increased risk of neurological disorders."'),
('10000000-0000-0000-0000-000000000003', 7, 'What earlier belief about the brain has been disproven?', '["That the brain only uses 10% of its capacity", "That the brain stops changing after a certain age", "That the brain has different regions", "That sleep affects brain function"]', 1, 'The passage says "contrary to earlier beliefs, the brain continues to change and develop well into old age."'),
('10000000-0000-0000-0000-000000000003', 8, 'The frontal lobe is primarily involved in:', '["Visual processing", "Auditory processing", "Decision-making and problem-solving", "Movement coordination"]', 2, 'The passage states: "The frontal lobe is involved in decision-making and problem-solving."'),
('10000000-0000-0000-0000-000000000003', 9, 'What does the comparison with the Milky Way emphasize?', '["The brain''s energy consumption", "The brain''s complexity", "The brain''s size", "The brain''s age"]', 1, 'Comparing the brain''s connections to "more connections than there are stars in the Milky Way galaxy" emphasizes the brain''s complexity.'),
('10000000-0000-0000-0000-000000000003', 10, 'What is the main topic of this passage?', '["Common brain disorders", "The structure and function of the human brain", "How to improve brain function", "The history of neuroscience"]', 1, 'The passage covers the brain''s structure (neurons, regions), function (neuroplasticity, sleep), and capabilities.');

-- Passage 4
INSERT INTO passages (id, exam_id, passage_number, title, content)
VALUES (
  '10000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  4,
  'Climate Change: Causes and Effects',
  '<h2 class="text-xl font-bold text-indigo-900 mb-4">Section 4: Climate Change: Causes and Effects</h2>
<p class="mb-4 leading-relaxed">Climate change is one of the most pressing issues of our time. Scientific consensus clearly indicates that the Earth''s climate is warming at an unprecedented rate, primarily due to human activities. The burning of fossil fuels, deforestation, and industrial processes have dramatically increased the concentration of greenhouse gases in the atmosphere.</p>
<p class="mb-4 leading-relaxed">The effects of climate change are already visible around the world. Global temperatures have risen by approximately 1.1°C since pre-industrial times. This warming has led to more frequent and severe weather events, including hurricanes, heatwaves, droughts, and floods. Sea levels are rising due to the melting of polar ice caps and thermal expansion of seawater, threatening coastal communities worldwide.</p>
<p class="mb-4 leading-relaxed">Biodiversity is also under threat. Many species are struggling to adapt to rapidly changing conditions, leading to shifts in migration patterns, breeding cycles, and habitat ranges. Coral reefs, often called the rainforests of the sea, are experiencing mass bleaching events due to rising ocean temperatures.</p>
<p class="mb-4 leading-relaxed">Addressing climate change requires a coordinated global effort. The Paris Agreement, signed by nearly 200 countries, represents a historic commitment to limit global warming to well below 2°C above pre-industrial levels. However, current policies and commitments are insufficient to meet these targets, and more ambitious action is urgently needed.</p>'
);

-- Passage 4 Questions
INSERT INTO questions (passage_id, question_number, question_text, options, correct_answer, explanation) VALUES
('10000000-0000-0000-0000-000000000004', 1, 'What is the primary cause of climate change according to the passage?', '["Natural climate cycles", "Human activities", "Volcanic eruptions", "Solar radiation changes"]', 1, 'The passage states: "primarily due to human activities" such as burning fossil fuels, deforestation, and industrial processes.'),
('10000000-0000-0000-0000-000000000004', 2, 'How much have global temperatures risen since pre-industrial times?', '["0.5°C", "1.1°C", "2.0°C", "3.5°C"]', 1, 'The passage states: "Global temperatures have risen by approximately 1.1°C since pre-industrial times."'),
('10000000-0000-0000-0000-000000000004', 3, 'What are coral reefs experiencing due to rising ocean temperatures?', '["Increased growth", "Mass bleaching events", "Migration to deeper waters", "Expansion to new areas"]', 1, 'The passage mentions "coral reefs are experiencing mass bleaching events due to rising ocean temperatures."'),
('10000000-0000-0000-0000-000000000004', 4, 'What does the Paris Agreement represent?', '["A plan to eliminate fossil fuels entirely", "A commitment to limit global warming to well below 2°C", "An agreement to stop deforestation", "A treaty to protect endangered species"]', 1, 'The passage calls it "a historic commitment to limit global warming to well below 2°C above pre-industrial levels."'),
('10000000-0000-0000-0000-000000000004', 5, 'According to the passage, what is true about current climate policies?', '["They are sufficient to meet targets", "They are insufficient to meet targets", "They have already stopped global warming", "They focus only on deforestation"]', 1, 'The passage states "current policies and commitments are insufficient to meet these targets."'),
('10000000-0000-0000-0000-000000000004', 6, 'What two factors contribute to rising sea levels?', '["Increased rainfall and river flooding", "Melting polar ice caps and thermal expansion of seawater", "Underground water extraction and dam construction", "Ocean currents and wind patterns"]', 1, 'The passage mentions "the melting of polar ice caps and thermal expansion of seawater."'),
('10000000-0000-0000-0000-000000000004', 7, 'Why are coral reefs called "the rainforests of the sea"?', '["Because they are found in tropical waters", "Because of their rich biodiversity", "Because they are green in color", "Because they absorb carbon dioxide"]', 1, 'Coral reefs are compared to rainforests because of their incredible biodiversity - they host a vast number of marine species.'),
('10000000-0000-0000-0000-000000000004', 8, 'How many countries signed the Paris Agreement?', '["Approximately 100", "Approximately 200", "Approximately 50", "All countries in the world"]', 1, 'The passage states "signed by nearly 200 countries."'),
('10000000-0000-0000-0000-000000000004', 9, 'What does "unprecedented" most likely mean?', '["Slow and gradual", "Never seen or experienced before", "Predictable and expected", "Minor and insignificant"]', 1, '"Unprecedented" means never done or known before. The context says the Earth is warming at an "unprecedented rate" - a rate never before seen.'),
('10000000-0000-0000-0000-000000000004', 10, 'What is the author''s attitude toward current climate action?', '["Satisfied with current progress", "Believing more ambitious action is urgently needed", "Skeptical that climate change is happening", "Optimistic that targets will be met easily"]', 1, 'The author states "more ambitious action is urgently needed," indicating they believe current efforts are not enough.');
