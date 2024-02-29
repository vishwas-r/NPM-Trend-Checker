var options = {
    zoomEnabled: true,
    theme: "light2",
    title: {
      text: "NPM Download Trend will be shown here",
      verticalAlign: "center"
    },
    toolTip: {
      shared: true
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
  
        //dataCopy = [...chart.data];
  
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
    var dataPoints;
  
    if(period == "daily")
      dataPoints = dps;
    else if(period == "weekly")
      dataPoints = sumOfNElements(dps, 7);
    else if(period == "monthly")
      dataPoints = sumOfNElements(dps, 30);
    else if(period == "yearly")
      dataPoints = sumOfNElements(dps, 365);
  
    return dataPoints;
  }
  
  function sumOfNElements(array, period, index = array.length - 1, count = 0, dps = []) {
    if (index < 0)
      return dps;
  
    var currentValue = typeof array[index].y === 'number' ? array[index].y : 0;
  
    if (count % period === 0) {
      dps.unshift({ ...array[index], y: currentValue });
    } else {
      dps[0].y += currentValue;
    }
  
    return sumOfNElements(array, period, index - 1, count + 1, dps);
  }
  $(function () {
    var focusedElement;
    $(document).on('focus', 'input', function () {
      if (focusedElement == this) return;
      focusedElement = this;
      setTimeout(function () { focusedElement.select(); }, 100);
    });
  });