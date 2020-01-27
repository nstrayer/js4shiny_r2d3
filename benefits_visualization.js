// !preview r2d3 data=tree_benefits

let current_selection = [];

// Some constants for visual encodings 
const margin = {left: 50, right: 100, top: 80, bottom: 25};
const selection_box_width = 120;
const selection_box_height = 40;
const submit_button_height = 30;
const selected_color = "orangered";
const normal_color = 'steelblue';
const axis_color = "#a5a5a5";


const header_y_center = margin.top/2;
const header_x_start = 160;

// Setup header area
const selected_area = svg.append('g')
  .attr('id', 'selected_area')
  .attr('transform', `translate(${10}, ${header_y_center})`);
  
selected_area.append('text')
  .text("Currently selected trees:")
  .attr('text-anchor', 'end')
  .style('alignment-baseline', 'middle')
  .attr('font-weight', 'bold')
  .attr('x', header_x_start);

// Blocks that encode selected trees
const selected_blocks = selected_area
  .append('g')
  .attr('id', 'blocks')
  .attr('transform', `translate(${header_x_start + 10},${-header_y_center})`);

const submit_button = selected_area
  .append('g')
  .attr('transform', `translate(${width - selection_box_width - 10},${-header_y_center})`)
  .on('click', submit_selection);

submit_button.append('rect')
  .attr('width', selection_box_width)
  .attr('height', submit_button_height)
  .attr('rx', 15)
  .attr('ry', 15)
  .attr('y', -submit_button_height/2)
  .attr('fill', 'grey');
  
submit_button.append('text')
  .text('Send to model')
  .attr('x', selection_box_width/2)
  .style('alignment-baseline', 'middle')
  .attr('text-anchor', 'middle')
  .attr('fill', 'white');


// Start with submit button hidden
hide_submit_button();

// Scales
const X = d3.scaleLog()
  .domain([8, d3.max(data, d => d.dollar_benefits)*1.5])
  .range([margin.left, width - margin.right]);
  
const Y = d3.scaleLog()
  .domain([10, d3.max(data, d => d.co2_benefits)*1.7])
  .range([height-margin.bottom, margin.top]);
  
const Size = d3.scaleSqrt()
  .domain([0, d3.max(data, d => d.num_obs)])
  .range([4,11]);
  
  
// Get data into proper format for the force simulation work  
const trees = data
  .map(d => Object.assign({id: d.common_name,
                           fx: X(d.dollar_benefits),
                           fy: Y(d.co2_benefits),
                           type: "data"}, d));

const tree_labels = data
  .map(d => Object.assign({id: `${d.common_name}_label`, 
                           type: 'label',
                           x: X(d.dollar_benefits) + Math.random(),
                           y: Y(d.co2_benefits) + Math.random(),
                           label: name_to_tspans(d.common_name)}, d));

const trees_and_labels = [...trees,...tree_labels];
const tree_to_label = trees
  .map(d => ({source: d.common_name, target: `${d.common_name}_label`}));


// Setup the simulation
const simulation = d3.forceSimulation(trees_and_labels)
      .force("charge", 
             d3.forceManyBody()
               .strength(d => d.type == 'data' ? 0: -70)
               .distanceMax(50)
       )
      .force("link", 
             d3.forceLink(tree_to_label)
               .id(d => d.id)
               //.strength(0.5)
       )
      .force('collision', 
             d3.forceCollide()
               .radius(d => d.type == 'data' ? Size(d.num_obs) + 2: 30)
       );
  

// Append all the data-related objects to the plot (unpositioned)
const links = svg.selectAll('line.label')
  .data(tree_to_label)
  .enter().append('line')
  .attr('class', 'label')
  .attr('stroke-width', 1)
  .attr('stroke', 'grey');
  
// The actual points
const tree_circles = svg.selectAll("circle.tree")  
  .data(trees_and_labels.filter(d => d.type == "data"))
  .enter().append('circle')
  .attr('class', 'tree')
  .attr('cx', d => d.fx)
  .attr('cy', d => d.fy)
  .attr("r", d => Size(d.num_obs))
  .attr("fill", normal_color)
  .attr("fill-opacity", 0.75)
  .on("click",  update_selection)
  .style('cursor', 'pointer');

const labels = svg.selectAll("g.label") 
  .data(trees_and_labels.filter(d => d.type == "label"))
  .enter().append('g')
  .attr('class', 'label')
  .on('click', update_selection);

// Add a small semi-opaque rectangle behind to make text easier to read
labels.append('rect')
  .attr('y', -10)
  .attr('x', -15)
  .attr("width", 30)
  .attr('height', 20)
  .attr('fill', 'white')
  .attr('fill-opacity', 0.8);

// Add actual name of tree  
const label_text = labels.append('text')
  .attr('text-anchor', 'middle')  
  .attr('font-size', 12)
  .html(d => d.label)
  .style('cursor', 'pointer');
 
draw_axes();

// Kickoff simulation
simulation.on("tick", () => {
  
  trees_and_labels.forEach(keep_labels_in_boundaries);
  
  labels
    .attr('transform', d => `translate(${d.x}, ${d.y})`);
   
  links
    .attr('x2', d => d.source.x)
    .attr('x1', d => d.target.x)
    .attr('y2', d => d.source.y)
    .attr('y1', d => d.target.y);
});

function submit_selection(){
  console.log(`Selected ${current_selection[0]} and ${current_selection[1]}`);
  
  if(Shiny){
    console.log("Sending to shiny");
    Shiny.setInputValue(
      "selected_species", 
      current_selection,
      {priority: "event"}
    );
  }
}

// Helper functions
function keep_labels_in_boundaries(d){
  const min_x = 25;
  const max_x = width - min_x;
  const min_y = margin.top;
  const max_y = height - 10;
  
  const clamp = (x, min, max) => Math.min(Math.max(x, min), max);
  
  if(d.x < min_x || d.x > max_x){
    d.x = clamp(d.x, min_x,  max_x);
    d.vx = -d.vx;
  }
  if(d.y < min_y || d.y > max_y){
    d.y = clamp(d.y, min_y,  max_y);
    d.vy = -d.vy;
  }
}

function update_selection(d){
  const tree_name = d.common_name || d;
  
  // First check if selection is currently selected 
  const currently_selected = current_selection.includes(tree_name);
  const selections_full = current_selection.length == 2;
  
  if(currently_selected){
    // Remove from selection list
    current_selection = current_selection.filter(d => d != tree_name);
  } else {
    if(selections_full){
      // Remove second selection from list and add this value
      current_selection = [current_selection[0]];
    } 
    
    // Append new name
    current_selection = [...current_selection, tree_name];
  }
  
  if(current_selection.length == 2){
    show_submit_button();
  } else {
    hide_submit_button();
  }
  
  const in_selection = d => current_selection.includes(d.common_name);
  
  // Redraw selection portion of data
  tree_circles
    .attr('fill', d => in_selection(d) ? selected_color: normal_color);
                       
  label_text
    .attr('font-weight', d =>  in_selection(d) ? "bold" : "normal")
    .attr('fill', d => in_selection(d)? selected_color : "black");
                       
  // Fill in selected codes boxes
  update_selection_boxes(current_selection);
}

function update_selection_boxes(selections){
  
  const all_trees = selected_blocks
    .selectAll('g.selection')
    .data(selections, d => d);
  
  // entering boxes
  const new_trees = all_trees
    .enter().append('g')
    .attr('class', 'selection')
    .attr('transform', (_,i) => `translate(${width + selection_box_width}, ${header_y_center})`);
    
  new_trees.append('rect')
    .attr('fill', selected_color)
    .attr("fill-opacity", 0.75)
    .attr('width', selection_box_width)
    .attr('height', selection_box_height)
    .attr('y', -selection_box_height/2)
    .attr('rx', 5)
    .attr('ry', 5);
    
  new_trees.append('text')
    .attr('x', selection_box_width/2)
    .style('alignment-baseline', 'middle')
    .attr('text-anchor', 'middle')
    .attr('fill', 'white')
    .text(d => d);
  
  // exiting boxes
  const exiting_trees = all_trees.exit();
  
  // Turn boxes grey
  exiting_trees.select('rect')
    .attr('fill', 'grey');
    
  // fly off screen
  exiting_trees
    .transition()
    .attr('transform', (_,i) => `translate(${i * (selection_box_width + 10)}, -100)`)
    .remove();
    
  // existing and new boxes
  const updating_trees = new_trees
    .merge(all_trees);
  
  updating_trees.transition()
    .attr('transform', (_,i) => `translate(${i * (selection_box_width + 10)}, ${header_y_center})`);
    
  updating_trees.on('click',  update_selection);
}

function show_submit_button(){
  submit_button
    .transition()
    .attr('transform', `translate(${width - selection_box_width - 10},${0})`);
}

function hide_submit_button(){
  submit_button
    .transition()
    .attr('transform', `translate(${width - selection_box_width - 5},${-selection_box_height*2.5})`);
}

function name_to_tspans(name){
  return name
    .split(' ')
    .reduce(
      (full, line, i) => full + `<tspan x="0" ${i != 0 ? `dy="10"`: ""}>${line}</tspan>`,
      ''
      );
}

function draw_axes(){
  // X axis
  svg.append("g")
    .attr('class', 'axis')
    .call(g => g
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(X).ticks(width / 80, ","))
    );
  
  // Y axis
  svg.append("g")
      .attr('class', 'axis')
      .call(g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(Y))
      );
  
  // Set color of all legend components
  svg.selectAll('g.axis line').attr('stroke',axis_color);
  svg.selectAll('g.axis path').attr('stroke', axis_color);
  svg.selectAll('g.axis text').attr('fill', axis_color);
}

