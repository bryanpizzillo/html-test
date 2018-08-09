

async function glossify({ content, language = "en", debug = false } = {}) {
	const safeData = cGovPrepareStr(content);
	const reqBody = `<?xml version=\"1.0\"?>
	 <soapenv:Envelope 
		xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
		xmlns:m="cips.nci.nih.gov/cdr">
		<soapenv:Header/>
		<soapenv:Body>
			<m:glossify>
				<m:fragment><![CDATA[${safeData}]]></m:fragment>
				<m:dictionaries><m:string>Cancer.gov</m:string></m:dictionaries>
				<m:languages><m:string>${language}</m:string></m:languages>
			</m:glossify>
		</soapenv:Body>
    </soapenv:Envelope>`;
        
    const res = await fetch(
        "http://glossifier-dev.cancer.gov/cgi-bin/glossify",
        {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-type': 'text/xml; charset=utf-8',
                'SOAPAction': 'cips.nci.nih.gov/cdr/glossify',
                'X-DEBUG-LEVEL': debug ? 3 : 1
            },
            body: reqBody            
        }
    );

    if (res.status !== 200){
        throw new Error(`Response Status, ${res.status}, is not valid`);
    }

    const rawXML = await res.text();

    //In theory we would call the following at this point to get XML
    //await new window.DOMParser()).parseFromString(str, "text/xml")

    return rawXML;
}

/**
* Prepare the data for sending to web service. Replace cr and lf with code, mark old web service
* provided URLs with __oldterm
*/
function cGovPrepareStr(data) {
	//alert("In cGovPrepareStr, data= " + data);
	var tempData = data;
	var result="";
	// These expressions look for two specific styles of links and then change them from
	//	<a whatever> to <a __oldterm>
	//	<a href="/dictionary/db_alpha.aspx?expand=s#symptom" onclick="javascript:popWindow('definition','symptom'); return false;">symptoms</a>
	//	<a class="definition" href="/Common/PopUps/popDefinition.aspx?term=bone marrow&amp;version=Patient&amp;language=English" onclick="javascript:popWindow('definition','bone marrow&amp;version=Patient&amp;language=English');  return(false);">bone marrow</a>
	// The most complete patterns (from the old Admin Tool code) don't work here:
	//	<a\s+(href=\"/dictionary/db_alpha.aspx\?expand=.+?>.+?</a>)
	//	<a\\s+(class=\"definition\".+?>.+?</a>)
	// The following two expressions expect the links to be in a particular order. The second set expect
	// a different order. No matter what order they are in in the editor, they always seem to come back the
	// second way. If this turns out to not be the case, we'll have to run the first two expressions as well
	// as the second.
	// var rxDict1 = new RegExp("<a\\s+(href=.+dictionary/db_alpha.aspx.+</a>)","i");
	var rxDef1 = new RegExp("<a\\s+(class=\"definition\".+?>.+?</a>)");
	var rxDict2 = new RegExp("<a\\s+(onclick=\"javascript:popWindow.+?href=.+?dictionary/db_alpha.aspx.+?</a>)","i");
	var rxDef2 = new RegExp("<a\\s+(onclick=\"javascript:popWindow.+?href=.+?popDefinition.aspx.+?</a>)");
	var rxDef3 = new RegExp("<a\\s+(href=\"/Common/PopUps/popDefinition.aspx.+?</a>)");
	tempData = cGovDoRegExp1(rxDict2, tempData);
	tempData = cGovDoRegExp1(rxDef2, tempData);
	tempData = cGovDoRegExp1(rxDef1, tempData);
	tempData = cGovDoRegExp1(rxDef3, tempData);
	for (var i=0;i<tempData.length;i++) {
		var c = tempData.charAt(i);
		if (c == "\n") {
			result += cGovLFConst;
		}
		else if (c == "\r") {
			result += cGovCRConst;
		}
		else if (c == "”") {	//right doulbe quote
			result += "&#148;";
		}
		else if (c == "—") {	//em dash
			result += "&#151;";
		}
		else if (c == "–") {	//en dash
			result += "&#150;";
		}
		else if (c == "Á") {	//A accent - for some reason WS chokes on this
			result += "&#193;";
		}
		else if (c == "Í") {	//I accent
			result += "&#205;";
		}
		else {
			result += c;
		}
	}
	//alert("result = " + result);
	return result;
}

/**
* Called for each regex, does the actual work of finding and editing the target link
*/
function cGovDoRegExp1(theRegExp, result) {
	var done = false;
	var offset = 0;
	while (!done) {
		var temp = result.substr(offset);
		if (temp == null) {
			done = true;
		}
		else {
			var target = theRegExp.exec(temp);
			//alert("target = " + target);
			if (target == null) {
				done = true;
			}
			else {
				offset += target.index;
				var iDed = cGovAddUniqueID(target[1]);
				result = result.replace(target[0],iDed);
				//alert("result = " + result);
				offset += iDed.length;
			}
		}
	}
	return result;
}

/**
* Add the __oldterm= to the old links
*/
function cGovAddUniqueID(data) {
	cGovUniqueId++;
	var uniqueID = "<a __oldterm=\"" + cGovUniqueId + "\" " + data;
	return uniqueID;
}

