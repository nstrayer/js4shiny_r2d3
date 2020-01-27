// !preview r2d3 data=tree_benefits

let current_selection = [];

const margin = {left: 80, right: 100, top: 50, bottom: 25};
const selection_box_width = 120;
const selection_box_height = margin.top*0.8;
const selected_color = "orangered";
const normal_color = 'steelblue';


const X = d3.scaleLog()
  .domain([4, d3.max(data, d => d.dollar_benefits)*1.5])
  .range([margin.left, width - margin.right]);
  
const Y = d3.scaleLog()
  .domain([15, d3.max(data, d => d.co2_benefits)*1.7])
  .range([height-margin.bottom, margin.top]);
  
const Size = d3.scaleSqrt()
  .domain([0, d3.max(data, d => d.num_obs)])
  .range([4,11]);
  
  
const trees = data
  .map(d => ({id: d.common_name,
              fx: X(d.dollar_benefits),
              fy: Y(d.co2_benefits),
              type: "data",
              ...d}));

const tree_labels = data
  .map(d => ({id: `${d.common_name}_label`, 
              type: 'label',
              x: X(d.dollar_benefits) + Math.random(),
              y: Y(d.co2_benefits) + Math.random(),
              label: name_to_tspans(d.common_name)}));

const trees_and_labels = [...trees,...tree_labels];
const tree_to_label = trees
  .map(d => ({source: d.common_name, 
              target: `${d.common_name}_label`}));


// Setup the simulation
const simulation = d3.forceSimulation(trees_and_labels)
      .force("charge", 
             d3.forceManyBody()
               .strength(d => d.type == 'data' ? 0: -70)
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
  
  
// Setup header area
const selected_area = svg.append('g')
  .attr('id', 'selected_area')
  .attr('transform', `translate(${10}, ${margin.top/2})`);
  
selected_area.append('text')
  .text("Currently selected trees:")
  .attr('text-anchor', 'end')
  .attr('transform', `translate(${150},${0})`);

const selected_blocks = selected_area
  .append('g')
  .attr('id', 'blocks')
  .attr('transform', `translate(${160},${-selection_box_height/2})`);



const submit_button = selected_area
  .append('g')
  .attr('transform', `translate(${width - selection_box_width - 5},${-selection_box_height*2.5})`);

submit_button.append('rect')
  .attr('width', selection_box_width)
  .attr('height', selection_box_height)
  .attr('fill', 'grey');
  
submit_button.append('text')
  .text('Send to model')
  .attr('y', selection_box_height/2)
  .attr('x', selection_box_width/2)
  .style('alignment-baseline', 'middle')
  .attr('text-anchor', 'middle')
  .attr('fill', 'white');

hide_submit_button();

const links = svg.selectAll('line.label')
  .data(tree_to_label)
  .enter().append('line')
  .attr('class', 'label')
  .attr('stroke-width', 1)
  .attr('stroke', 'grey');
  
  
const tree_circles = svg.selectAll("circle.tree")  
  .data(trees_and_labels.filter(d => d.type == "data"))
  .enter().append('circle')
  .attr('class', 'tree')
  .attr('cx', d => d.fx)
  .attr('cy', d => d.fy)
  .attr("r", d => Size(d.num_obs))
  .attr("fill", normal_color)
  .attr("fill-opacity", 0.75)
  .on("click",  update_selection);


function update_selection(d){
  const tree_name = d.common_name;
  
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
  
  // Redraw selection portion of data
  tree_circles
    .attr('fill', d => current_selection.includes(d.common_name) 
                       ? selected_color 
                       : normal_color );
                       
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
    .attr('transform', (_,i) => `translate(${width + selection_box_width}, 0)`);
    
  new_trees.append('rect')
    .attr('fill', selected_color)
    .attr("fill-opacity", 0.75)
    .attr('width', selection_box_width)
    .attr('height', selection_box_height)
    .attr('rx', 5)
    .attr('ry', 5);
    
  new_trees.append('text')
    .attr('y', selection_box_height/2)
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
    .attr('transform', (_,i) => `translate(${i * (selection_box_width + 10)}, 0)`);
}

function show_submit_button(){
  submit_button
    .transition()
    .attr('transform', `translate(${width - selection_box_width - 5},${-selection_box_height/2})`);
}

function hide_submit_button(){
  submit_button
    .transition()
    .attr('transform', `translate(${width - selection_box_width - 5},${-selection_box_height*2.5})`);
}
  
const labels = svg.selectAll("g.label") 
  .data(trees_and_labels.filter(d => d.type == "label"))
  .enter().append('g')
  .attr('class', 'label');
  
labels.append('rect')
  .attr('y', -10)
  .attr('x', -15)
  .attr("width", 30)
  .attr('height', 20)
  .attr('fill', 'white')
  .attr('fill-opacity', 0.8);
  
const label_text = labels.append('text')
  .attr('text-anchor', 'middle')  
  .attr('font-size', 12)
  .html(d => d.label);
 
// Kickoff simulation
simulation.on("tick", () => {
    
  labels
    .attr('transform', d => `translate(${d.x}, ${d.y})`);
   
  links
    .attr('x2', d => d.source.x)
    .attr('x1', d => d.target.x)
    .attr('y2', d => d.source.y)
    .attr('y1', d => d.target.y);
});

// Draw axes
svg.append("g").call(g => g
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(d3.axisBottom(X).ticks(width / 80, ","))
);

svg.append("g").call(g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(Y))
);



function name_to_tspans(name){
  return name
    .split(' ')
    .reduce(
      (full, line, i) => full + `<tspan x="0" ${i != 0 ? `dy="10"`: ""}>${line}</tspan>`,
      ''
      );
}

