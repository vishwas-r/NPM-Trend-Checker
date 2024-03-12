//localStorage.setItem('packagesName', "");
var options = {
  zoomEnabled: true,
  theme: "light2",
  title: {
    text: "NPM Download Trend will be shown here",
    verticalAlign: "center"
  },
  toolTip: {
    shared: true,
    contentFormatter: function(e) {
      var content = "<strong>" + e.entries[0].dataPoint.label + "</strong><br/>";
      for (var i = 0; i < e.entries.length; i++) {
        content += "<span style='color: " + e.entries[i].dataSeries.color + ";'>" + e.entries[i].dataSeries.name +": </span>" + e.entries[i].dataPoint.y + "</strong>";
        content += "<br/>";
      }
      return content;
    }
  },
  legend: {
    cursor: "pointer",
    itemclick: function (e) {
      if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
        e.dataSeries.visible = false;
      } else {
        e.dataSeries.visible = true;
      }
      e.chart.render();
    }
  }
};
var today = new Date();
$("#toDate").val(today.toISOString().split('T')[0]);
$("#fromDate").val(new Date(today.setMonth(today.getMonth() - 1)).toISOString().split('T')[0]);

var chart = new CanvasJS.Chart("chartContainer", options);
chart.render();

var storedFormData = JSON.parse(localStorage.getItem('packagesName')) || [],
    updatedOptions = {
      ...options,    
      exportEnabled: true,
      title: {
        text: storedFormData.length > 1 ? storedFormData.join(" vs ") : storedFormData,
        fontSize: 18,
        verticalAlign: "top"
      },
      axisX: {
        title: "Date"
      },
      axisY: {
        title: "Downloads"
      },
      data: []
    };
var dataCopy;

$("#trendsForm").submit(function(e) {
  e.preventDefault();

  storedFormData = JSON.parse(localStorage.getItem('packagesName')) || [];
  var packageName = $("#packageName").val();

  if(storedFormData.indexOf(packageName) < 0 && packageName.length > 0) {
    storedFormData.push(packageName);
  }
  localStorage.setItem('packagesName', JSON.stringify(storedFormData));

  chart.destroy();
  chart = new CanvasJS.Chart("chartContainer", updatedOptions);

  if(!$('#packagesList').hasClass("card")){
    $('#packagesList').addClass("card mt-5")
  }

  $("#packagesList").empty();
  chart.options.data = [];
  for(var i = 0; i < storedFormData.length; i++) {
    populateAndRenderChart(storedFormData[i]);
    $("#packagesList").append("<div class='package mr-1' id='" + storedFormData[i] + "'>" + storedFormData[i] + "<span class='close-icon remove-package' style='cursor: pointer'>❌</span></div>");
  }
  if(packageName)
    $.ajax({
      url: 'https://bundlephobia.com/api/similar-packages?package=' + packageName,
      type: 'GET',
      success: function(data) {
        $("#packagesList").append("𝕊𝕚𝕞𝕚𝕝𝕒𝕣 ℙ𝕒𝕔𝕜𝕒𝕘𝕖𝕤: " + data.category.similar.join(", "));
      }
    });


  $(".remove-package").click(removePackages);
  $("#packageName").val('');
});

function populateAndRenderChart(packageName) {
  var fromDate = $("#fromDate").val() || CanvasJS.formatDate(new Date(new Date().setFullYear(new Date().getFullYear() - 1)), "YYYY-MM-DD");
  var toDate = $("#toDate").val() || CanvasJS.formatDate(new Date(), "YYYY-MM-DD");
  $.ajax({
    url: 'https://api.npmjs.org/downloads/range/' + fromDate + ':' + toDate + '/' + packageName,
    type: 'GET',
    success: function(data) {
      // Create an array of data points
      var dataPoints = [], date, downloads;
      for (var i = 0; i < data.downloads.length; i++) {
        date = new Date(data.downloads[i].day);
        downloads = data.downloads[i].downloads;
        dataPoints.push({
          x: date,
          y: downloads
        });
      }

      chart.options.data.push({ type: "spline", dataPoints: groupData([...dataPoints]), showInLegend: true, name: packageName });  
      chart.render();
      chart.title.set("text", (JSON.parse(localStorage.getItem('packagesName')) || []).length > 1 ? (JSON.parse(localStorage.getItem('packagesName')) || []).join(" vs ") : (JSON.parse(localStorage.getItem('packagesName')) || ""));
    },
    error: function (jqXHR, exception) {
      alert("Something went wrong! Please try again with a valid package name");

      $("#" + packageName).remove();

      var storedFormData = JSON.parse(localStorage.getItem('packagesName')) || [];

      storedFormData = storedFormData.filter(e => e !== packageName);
      localStorage.setItem('packagesName', JSON.stringify(storedFormData));
      $(this).parent().remove();
    },
    beforeSend: function(){
      $('#loading-image').show();
    },
    complete: function(){
      $('#loading-image').hide();
    }
  });
}

function removePackages() {
  var storedFormData = JSON.parse(localStorage.getItem('packagesName')) || [];
  var packageName = $(this).parent().text().slice(0, -1);

  storedFormData = storedFormData.filter(e => e !== packageName);
  localStorage.setItem('packagesName', JSON.stringify(storedFormData));
  $(this).parent().remove();

  if(storedFormData.length <= 0) {
    chart.options = options;
    chart.render();
    $("#packagesList").removeClass("card");
  }
  else {
    updatedOptions.data = chart.options.data = [];
    for(var i = 0; i < storedFormData.length; i++)
      populateAndRenderChart(storedFormData[i]);
  }
}

function groupData(dps) {
  var period = $('#dataGroup').find(":selected").val();
  return sumData(dps, period);
}

function groupByDateRange(array, aggregation) {
  var grouped = {};
  array.forEach(obj => {
    var dateRange = getDateRange(obj.x, aggregation);
    if (!grouped[dateRange]) {
      grouped[dateRange] = [];
    }
    grouped[dateRange].push(obj);
  });
  return grouped;
}

function getDateRange(date, aggregation) {
  var year = date.getFullYear();
  var month = date.getMonth();
  var day = date.getDate();

  if (aggregation === 'weekly') {
    var firstDayOfWeek = new Date(date);
    firstDayOfWeek.setDate(day - date.getDay() + 1);
    var lastDayOfWeek = new Date(date);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
    return `${formatDate(firstDayOfWeek)} - ${formatDate(lastDayOfWeek)}`;
  } else if (aggregation === 'monthly') {
    var firstDayOfMonth = new Date(year, month, 1);
    var lastDayOfMonth = new Date(year, month + 1, 0);
    return `${formatDate(firstDayOfMonth)} - ${formatDate(lastDayOfMonth)}`;
  } else if (aggregation === 'yearly') {
    var firstDayOfYear = new Date(year, 0, 1);
    var lastDayOfYear = new Date(year, 11, 31);
    return `${formatDate(firstDayOfYear)} - ${formatDate(lastDayOfYear)}`;
  } else if (aggregation === 'daily') {
    return `${formatDate(date)}`;
  } else {
    throw new Error('Invalid aggregation level');
  }
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function sumData(array, aggregation) {
  var aggregatedData = groupByDateRange(array, aggregation);
  var result = [];
  for (var dateRange in aggregatedData) {
    var objects = aggregatedData[dateRange];
    var sum = objects.reduce((acc, obj) => acc + obj.y, 0);
    var aggregatedObject = {
      dateRange,
      sum,
      ...objects[0] // Retain other key-values
    };

    aggregatedObject.label = aggregatedObject.dateRange; delete aggregatedObject.dateRange;
    aggregatedObject.y = aggregatedObject.sum; delete aggregatedObject.sum;
    result.push(aggregatedObject);
  }
  return result;
}

$(function () {
  var focusedElement;
  $(document).on('focus', 'input', function () {
    if (focusedElement == this) return;
    focusedElement = this;
    setTimeout(function () { focusedElement.select(); }, 100);
  });
});
